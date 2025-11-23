// server/src/routes/products.routes.js
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

/* ================== Utils precios ================== */
function getNormalizedPrice(product, priceValue) {
  if (!product?.size_value || !product?.size_unit) return null;
  const size = Number(product.size_value);
  const unit = String(product.size_unit).toLowerCase();
  if (!size || Number.isNaN(size)) return null;

  if (["g", "gr", "gram", "grams"].includes(unit)) {
    return +(priceValue / (size / 100)).toFixed(2);
  }
  if (["kg", "kilos"].includes(unit)) {
    return +((priceValue / (size * 1000)) * 100).toFixed(2);
  }
  if (["ml"].includes(unit)) {
    return +(priceValue / (size / 100)).toFixed(2);
  }
  if (["l", "lt", "litro", "litros"].includes(unit)) {
    return +((priceValue / (size * 1000)) * 100).toFixed(2);
  }

  return null;
}

function isStale(capturedAt, hours = 48) {
  if (!capturedAt) return true;
  const ms = Date.now() - new Date(capturedAt).getTime();
  return ms > hours * 60 * 60 * 1000;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
}

/* ============================================================
   CRUD BÁSICO
============================================================ */
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
    res.json({ ok: true, items: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   SEARCH (antes de rutas dinámicas!)
============================================================ */
router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);

    if (/^\d{6,14}$/.test(q)) {
      const { data } = await supabase
        .from("products")
        .select("id, name, brand, ean, image_url, size_value, size_unit")
        .eq("ean", q)
        .limit(10);
      if (data?.length) return res.json(data);
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, name, brand, ean, image_url, size_value, size_unit")
      .ilike("name", `%${q}%`)
      .limit(20);

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   VINCULAR EAN
============================================================ */
router.post("/:id/bind-ean", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { ean } = req.body || {};
    if (!id || !ean) return res.status(400).json({ error: "id y ean requeridos" });

    const { data: conflict } = await supabase
      .from("products")
      .select("id")
      .eq("ean", ean)
      .neq("id", id)
      .maybeSingle();

    if (conflict)
      return res.status(409).json({
        error: "EAN ya asignado a otro producto",
        product_id: conflict.id,
      });

    const { data } = await supabase
      .from("products")
      .update({ ean })
      .eq("id", id)
      .select("id, name, ean")
      .single();

    res.json({ ok: true, product: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   NUTRICIÓN – GET (ANTES DE RUTAS DINÁMICAS!)
============================================================ */
router.get("/:id/nutrition", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const { data, error } = await supabase
      .from("nutrition")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();

    if (error && error.code !== "PGRST116")
      return res.status(500).json({ error: error.message });

    if (!data) return res.status(404).json({ error: "Sin datos nutricionales" });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   NUTRICIÓN – UPSERT MANUAL
============================================================ */
router.put("/:id/nutrition", async (req, res) => {
  try {
    const product_id = Number(req.params.id);

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

    const { data: existing } = await supabase
      .from("nutrition")
      .select("id")
      .eq("product_id", product_id)
      .maybeSingle();

    let result;

    if (existing?.id) {
      const { data } = await supabase
        .from("nutrition")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      result = data;
    } else {
      const { data } = await supabase
        .from("nutrition")
        .insert([{ product_id, ...payload }])
        .select()
        .single();
      result = data;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   DETALLE COMPLETO (DEJA ESTO AL FINAL)
============================================================ */
router.get("/detail/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const { data: product } = await supabase
      .from("products")
      .select("id, name, brand, ean, image_url, category, size_value, size_unit")
      .eq("id", productId)
      .single();

    const { data: nutrition } = await supabase
      .from("nutrition")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();

    const { data: pricesRaw } = await supabase
      .from("prices")
      .select(`
        id, price, currency, url, promo_text,
        recorded_at, captured_at, updated_at, expires_at,
        store_id, stores ( id, name, logo_url )
      `)
      .eq("product_id", productId);

    let prices = (pricesRaw || []).map((p) => {
      const normalized = getNormalizedPrice(product, p.price);
      const stale = isStale(p.captured_at || p.recorded_at);
      const expired = isExpired(p.expires_at);
      return {
        ...p,
        store_name: p.stores?.name ?? null,
        store_logo: p.stores?.logo_url ?? null,
        normalized_price: normalized,
        stale,
        expired,
      };
    });

    prices = prices.filter((p) => p.normalized_price != null);

    res.json({
      product,
      nutrition: nutrition || null,
      prices,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ================== Obtener categorías únicas ================== */
router.get("/categories/list", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .not("category", "is", null);

    if (error) throw error;

    const cats = [...new Set(data.map((x) => x.category.trim()))];
    cats.sort();

    return res.json({ categories: cats });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


export default router;
