import { Router } from "express";
import { supabase } from "../config/db.js";

// === Middleware mínimo de auth: requiere Bearer y carga user.id ===
async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Falta token Bearer" });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) return res.status(401).json({ error: "Token inválido" });

    req.user = { id: data.user.id };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Auth error" });
  }
}

const router = Router();

// === Helpers ===
async function getOrCreateCartId(user_id) {
  const { data: found, error: e1 } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", user_id)
    .maybeSingle();
  if (e1) throw e1;
  if (found?.id) return found.id;

  const { data: created, error: e2 } = await supabase
    .from("carts")
    .insert([{ user_id }])
    .select("id")
    .single();
  if (e2) throw e2;
  return created.id;
}

async function assertItemOwnership(item_id, user_id) {
  // Trae el cart_id del item y verifica que ese cart pertenezca al usuario
  const { data: item, error: e1 } = await supabase
    .from("cart_items")
    .select("id, cart_id")
    .eq("id", item_id)
    .single();
  if (e1) throw e1;
  const { data: cart, error: e2 } = await supabase
    .from("carts")
    .select("id")
    .eq("id", item.cart_id)
    .eq("user_id", user_id)
    .single();
  if (e2) throw e2;
  if (!cart?.id) return null;
  return { item, cart_id: cart.id };
}

// === GET /api/cart  -> devuelve carrito + items (con joins básicos) ===
router.get("/", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const cart_id = await getOrCreateCartId(user_id);

    const { data: items, error } = await supabase
      .from("cart_items")
      .select(`
        id, product_id, store_id, quantity, unit_price,
        products ( name, image_url ),
        stores ( name )
      `)
      .eq("cart_id", cart_id)
      .order("id", { ascending: true });

    if (error) throw error;

    // Normaliza respuesta (evita objetos anidados con nombres repetidos)
    const mapped = (items || []).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      store_id: it.store_id,
      qty: it.quantity,
      unit_price: it.unit_price,
      name: it.products?.name || null,
      image_url: it.products?.image_url || null,
      store_name: it.stores?.name || null,
    }));

    return res.json({ cart_id, items: mapped });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// === POST /api/cart/add  -> agrega o suma cantidad ===
router.post("/add", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id, store_id, unit_price, qty } = req.body || {};
    if (!product_id || !store_id || !unit_price) {
      return res.status(400).json({ error: "product_id, store_id y unit_price son requeridos" });
    }
    const quantity = Number(qty || 1);
    const cart_id = await getOrCreateCartId(user_id);

    // ¿Existe ya mismo producto/tienda en el carrito?
    const { data: existing, error: e1 } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cart_id)
      .eq("product_id", product_id)
      .eq("store_id", store_id)
      .maybeSingle();
    if (e1) throw e1;

    if (existing?.id) {
      const newQty = (existing.quantity || 0) + quantity;
      const { data, error: e2 } = await supabase
        .from("cart_items")
        .update({ quantity: newQty, unit_price })
        .eq("id", existing.id)
        .select("id, cart_id, product_id, store_id, quantity, unit_price")
        .single();
      if (e2) throw e2;
      return res.json(data);
    }

    // Inserta nuevo ítem
    const { data, error: e3 } = await supabase
      .from("cart_items")
      .insert([{ cart_id, product_id, store_id, quantity, unit_price }])
      .select("id, cart_id, product_id, store_id, quantity, unit_price")
      .single();
    if (e3) throw e3;

    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// === POST /api/cart/update  -> setea cantidad exacta ===
router.post("/update", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { item_id, qty } = req.body || {};
    const quantity = Number(qty);
    if (!item_id || Number.isNaN(quantity)) {
      return res.status(400).json({ error: "item_id y qty son requeridos" });
    }

    const owned = await assertItemOwnership(item_id, user_id);
    if (!owned) return res.status(404).json({ error: "Not found" });

    if (quantity <= 0) {
      await supabase.from("cart_items").delete().eq("id", item_id);
      return res.json({ ok: true, deleted: true });
    }

    const { data, error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", item_id)
      .select("id, cart_id, product_id, store_id, quantity, unit_price")
      .single();
    if (error) throw error;

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// === POST /api/cart/remove  -> borra ítem ===
router.post("/remove", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { item_id } = req.body || {};
    if (!item_id) return res.status(400).json({ error: "item_id requerido" });

    const owned = await assertItemOwnership(item_id, user_id);
    if (!owned) return res.status(404).json({ error: "Not found" });

    await supabase.from("cart_items").delete().eq("id", item_id);
    return res.json({ ok: true, deleted: true });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

// === POST /api/cart/clear  -> vacía el carrito del usuario ===
router.post("/clear", requireAuth, async (req, res) => {
  try {
    const user_id = req.user.id;
    const cart_id = await getOrCreateCartId(user_id);
    await supabase.from("cart_items").delete().eq("cart_id", cart_id);
    return res.json({ ok: true, cleared: true });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

export default router;
