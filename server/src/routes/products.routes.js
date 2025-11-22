import { Router } from "express";
import { supabase } from "../config/db.js";

const router = Router();

/* ================== Utils nutrición ================== */
function pickNum(nutr, keys) {
  for (const k of keys) {
    const v = nutr?.[k];
    if (v !== undefined && v !== null && v !== "") {
      const num = Number(String(v).replace(",", "."));
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

function buildNutrition(nutr) {
  let kcal100 = pickNum(nutr, ["energy-kcal_100g", "energy-kcal"]);
  if (kcal100 == null) {
    const kj100 = pickNum(nutr, ["energy_100g", "energy"]);
    if (kj100 != null) kcal100 = +(kj100 / 4.184).toFixed(0);
  }
  return {
    calories_kcal_100g: kcal100,
    protein_g_100g: pickNum(nutr, ["proteins_100g", "protein_100g", "proteins"]),
    fat_g_100g: pickNum(nutr, ["fat_100g", "fat"]),
    carbs_g_100g: pickNum(nutr, ["carbohydrates_100g", "carbs_100g", "carbohydrates"]),
    sugar_g_100g: pickNum(nutr, ["sugars_100g", "sugar_100g", "sugars"]),
    fiber_g_100g: pickNum(nutr, ["fiber_100g", "fibers_100g", "fiber"]),
    salt_g_100g: pickNum(nutr, ["salt_100g", "salt"]),
  };
}

function parseSizeCandidates(p) {
  const candidates = [p.quantity, p.product_quantity, p.serving_size].filter(Boolean);
  for (const cand of candidates) {
    const m = String(cand).match(/([\d.,]+)\s*([a-zA-Z]+)/);
    if (m) {
      const value = Number(String(m[1]).replace(",", "."));
      const unit = m[2].toLowerCase();
      if (!Number.isNaN(value)) return { size_value: value, size_unit: unit };
    }
  }
  return { size_value: null, size_unit: null };
}

/* ================== Utils precios ================== */
function getNormalizedPrice(product, priceValue) {
  if (!product?.size_value || !product?.size_unit) return null;
  const size = Number(product.size_value);
  const unit = String(product.size_unit).toLowerCase();
  if (!size || Number.isNaN(size)) return null;

  // gramos → $/100g
  if (["g", "gr", "gram", "grams"].includes(unit)) {
    return +(priceValue / (size / 100)).toFixed(2);
  }
  // kg → $/100g
  if (["kg", "kilos"].includes(unit)) {
    return +((priceValue / (size * 1000)) * 100).toFixed(2);
  }
  // ml → $/100ml
  if (["ml"].includes(unit)) {
    return +(priceValue / (size / 100)).toFixed(2);
  }
  // litros → $/100ml
  if (["l", "lt", "litro", "litros"].includes(unit)) {
    return +((priceValue / (size * 1000)) * 100).toFixed(2);
  }
  return null;
}

function isStale(capturedAt, staleHours = 48) {
  if (!capturedAt) return true;
  const ms = Date.now() - new Date(capturedAt).getTime();
  return ms > staleHours * 60 * 60 * 1000;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
}

/* ================== CRUD básico ================== */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, ean, category, image_url, size_value, size_unit")
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return res.json({ ok: true, items: data });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

router.get("/by-id/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [{ data: prod, error: e1 }, { data: nutr, error: e2 }] = await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase.from("nutrition").select("*").eq("product_id", id).maybeSingle(),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (!prod) return res.status(404).json({ error: "Producto no encontrado" });
    return res.json({ product: prod, nutrition: nutr || null });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, brand, ean, category, size_value, size_unit, image_url } = req.body || {};
    if (!name) return res.status(400).json({ error: "El nombre es obligatorio" });

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: name.trim(),
          brand: brand || null,
          ean: ean || null,
          category: category || null,
          size_value: size_value || null,
          size_unit: size_unit || null,
          image_url: image_url || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = (({ name, brand, category, image_url, size_value, size_unit }) => ({
      name,
      brand,
      category,
      image_url,
      size_value,
      size_unit,
    }))(req.body || {});
    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return res.json({ ok: true, product: data });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

/* ================== Search por texto / EAN ================== */
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);

    // Búsqueda por EAN (solo dígitos, 6–14)
    if (/^\d{6,14}$/.test(q)) {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, brand, ean, image_url, size_value, size_unit")
        .eq("ean", q)
        .limit(10);
      if (error) throw error;
      if (data?.length) return res.json(data);
    }

    // Búsqueda por name ilike
    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, ean, image_url, size_value, size_unit")
      .ilike("name", `%${q}%`)
      .order("id", { ascending: true })
      .limit(20);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/* ================== Vincular EAN ================== */
router.post("/:id/bind-ean", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { ean } = req.body || {};
    if (!id || !ean) return res.status(400).json({ error: "id y ean son requeridos" });

    const { data: conflict, error: chkErr } = await supabase
      .from("products")
      .select("id")
      .eq("ean", ean)
      .neq("id", id)
      .maybeSingle();
    if (chkErr) throw chkErr;
    if (conflict) {
      return res
        .status(409)
        .json({ error: "EAN ya está asignado a otro producto", product_id: conflict.id });
    }

    const { data, error } = await supabase
      .from("products")
      .update({ ean })
      .eq("id", id)
      .select("id, name, ean")
      .single();
    if (error) throw error;
    return res.json({ ok: true, product: data });
  } catch (err) {
    return res.status(500).json({ error: String(err.message || err) });
  }
});

/* ================== Upsert nutrición manual ================== */
router.put("/:id/nutrition", async (req, res) => {
  try {
    const product_id = Number(req.params.id);
    if (!product_id) return res.status(400).json({ error: "product_id inválido" });

    const fields = [
      "calories_kcal_100g",
      "protein_g_100g",
      "fat_g_100g",
      "carbs_g_100g",
      "sugar_g_100g",
      "fiber_g_100g",
      "salt_g_100g",
      "nutriscore_grade",
      "nova_group",
      "allergens",
      "ingredients",
    ];
    const payload = {};
    for (const f of fields) if (f in req.body) payload[f] = req.body[f];

    const { data: exist } = await supabase
      .from("nutrition")
      .select("id")
      .eq("product_id", product_id)
      .maybeSingle();

    if (exist?.id) {
      const { data, error } = await supabase
        .from("nutrition")
        .update(payload)
        .eq("id", exist.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    } else {
      const { data, error } = await supabase
        .from("nutrition")
        .insert([{ product_id, ...payload }])
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/* ================== Detalle completo ==================
   GET /api/products/detail/:id

   Devuelve:
   {
     product,
     nutrition,
     prices: [ ... ],
     best,                  // mejor por precio normalizado
     summary: {
       best_price,
       best_store_id,
       best_normalized,
       stores
     },
     params: { ... }
   }
======================================================== */
router.get("/detail/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!productId) return res.status(400).json({ error: "productId inválido" });

    // 1) Producto
    const { data: product, error: eProd } = await supabase
      .from("products")
      .select("id, name, brand, ean, image_url, category, size_value, size_unit")
      .eq("id", productId)
      .single();

    if (eProd) {
      // error 406/404 → no encontrado
      if (eProd.code === "PGRST116" || eProd.code === "PGRST106") {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      return res.status(500).json({ error: eProd.message });
    }

    // 2) Nutrición (puede no existir)
    const { data: nutrition, error: eNut } = await supabase
      .from("nutrition")
      .select(
        "calories_kcal_100g, protein_g_100g, fat_g_100g, carbs_g_100g, sugar_g_100g, fiber_g_100g, salt_g_100g, nutriscore_grade, nova_group, allergens, ingredients, updated_at"
      )
      .eq("product_id", productId)
      .maybeSingle();
    if (eNut) return res.status(500).json({ error: eNut.message });

    // 3) Precios por tienda
    const { data: pricesRaw, error: ePrices } = await supabase
      .from("prices")
      .select(
        `
        id,
        price,
        currency,
        url,
        promo_text,
        recorded_at,
        captured_at,
        updated_at,
        expires_at,
        store_id,
        stores ( id, name, logo_url )
      `
      )
      .eq("product_id", productId);

    if (ePrices) return res.status(500).json({ error: ePrices.message });

    // Parámetros opcionales
    const staleHours = Number(req.query.staleHours ?? 48);
    const hideExpired = String(req.query.hideExpired ?? "1") === "1";
    const preferFresh = String(req.query.preferFresh ?? "1") === "1";

    // 4) Normalización y flags
    let prices = (pricesRaw || []).map((p) => {
      const normalized = getNormalizedPrice(product, p.price);
      const stale = isStale(p.captured_at || p.recorded_at, staleHours);
      const expired = isExpired(p.expires_at);
      return {
        id: p.id,
        store_id: p.store_id,
        store_name: p.stores?.name ?? null,
        store_logo: p.stores?.logo_url ?? null,
        price: p.price,
        currency: p.currency || "CLP",
        url: p.url,
        promo_text: p.promo_text,
        captured_at: p.captured_at || p.recorded_at,
        expires_at: p.expires_at,
        normalized_price: normalized,
        stale,
        expired,
      };
    });

    // Filtrados
    prices = prices.filter((x) => x.normalized_price != null);
    if (hideExpired) prices = prices.filter((x) => !x.expired);

    // Orden
    prices.sort((a, b) => {
      if (a.normalized_price !== b.normalized_price) {
        return a.normalized_price - b.normalized_price;
      }
      if (preferFresh && a.stale !== b.stale) return a.stale ? 1 : -1;
      if (a.price !== b.price) return a.price - b.price;
      return a.id - b.id;
    });

    // Mejores opciones
    const bestByUnit =
      prices.length > 0
        ? prices.reduce((a, b) =>
            a.normalized_price <= b.normalized_price ? a : b
          )
        : null;

    const bestByPrice =
      prices.length > 0
        ? prices.reduce((a, b) => (a.price <= b.price ? a : b))
        : null;

    const storesSet = new Set(prices.map((p) => p.store_id));

    return res.json({
      product,
      nutrition: nutrition ?? null,
      prices,
      best: bestByUnit,
      summary: {
        best_price: bestByPrice?.price ?? null,
        best_store_id: bestByPrice?.store_id ?? null,
        best_normalized: bestByUnit?.normalized_price ?? null,
        stores: storesSet.size,
      },
      params: { staleHours, hideExpired, preferFresh },
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error: " + (err.message || String(err)),
    });
  }
});

export default router;
