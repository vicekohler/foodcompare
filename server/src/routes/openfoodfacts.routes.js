import { Router } from "express";
import { supabase } from "../config/db.js";

const router = Router();

/* ========== Utils OFF ========== */
function parseQuantity(qty) {
  if (!qty) return { value: null, unit: null };
  const m = String(qty).match(/([\d.,]+)\s*([a-zA-Z]+)/);
  if (!m) return { value: null, unit: null };
  return {
    value: Number(String(m[1]).replace(",", ".")),
    unit: m[2].toLowerCase(),
  };
}

function mapOFF(p) {
  if (!p) return null;
  const { value: size_value, unit: size_unit } = parseQuantity(p.quantity);
  const nutr = p.nutriments || {};
  return {
    product: {
      name: p.product_name || p.generic_name || null,
      brand: (p.brands || "").split(",")[0]?.trim() || null,
      ean: p.code || null,
      category: (p.categories || p.categories_tags?.[0] || "")
        .toString()
        .split(",")[0]?.trim() || null,
      image_url: p.image_url || null,
      size_value,
      size_unit,
    },
    nutrition: {
      calories_kcal_100g: nutr["energy-kcal_100g"] ?? null,
      protein_g_100g: nutr.proteins_100g ?? null,
      fat_g_100g: nutr.fat_100g ?? null,
      carbs_g_100g: nutr.carbohydrates_100g ?? null,
      sugar_g_100g: nutr.sugars_100g ?? null,
      fiber_g_100g: nutr.fiber_100g ?? null,
      salt_g_100g: nutr.salt_100g ?? null,
      nutriscore_grade: p.nutriscore_grade || null,
      nova_group: p.nova_group || null,
      allergens: p.allergens || null,
      ingredients: p.ingredients_text || null,
    },
  };
}

async function fetchOFFProduct(ean) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json`;
    const r = await fetch(url, { signal: ctrl.signal });
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

/* ========== GET espejo OFF (mapeado) ========== */
router.get("/ean/:ean", async (req, res) => {
  try {
    const j = await fetchOFFProduct(req.params.ean);
    if (!j || j.status !== 1) return res.status(404).json({ error: "Producto no encontrado en OFF" });
    return res.json(mapOFF(j.product));
  } catch (e) {
    console.error("OFF /ean error:", e);
    return res.status(500).json({ error: "OFF error: " + (e.message || e) });
  }
});

router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Falta parámetro q" });
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=1`;
    const r = await fetch(url);
    const j = await r.json();
    const p = j?.products?.[0];
    if (!p) return res.status(404).json({ error: "Sin resultados" });
    return res.json(mapOFF(p));
  } catch (e) {
    console.error("OFF /search error:", e);
    return res.status(500).json({ error: "OFF error: " + (e.message || e) });
  }
});

/* ========== Import OFF → products + nutrition ========== */
router.post("/import/:ean", async (req, res) => {
  const { ean } = req.params;
  console.log(`[IMPORT] start ean=${ean}`);

  try {
    // 1) OFF
    const j = await fetchOFFProduct(ean);
    if (!j || j.status !== 1) {
      console.warn(`[IMPORT] OFF not found ean=${ean}`);
      return res.status(404).json({ error: "Producto no encontrado en OFF" });
    }
    const dto = mapOFF(j.product);
    if (!dto?.product?.name) {
      console.warn(`[IMPORT] OFF sin nombre ean=${ean}`);
      return res.status(400).json({ error: "OFF sin nombre de producto" });
    }

    // 2) Upsert products por ean (requiere CONSTRAINT única en products.ean)
    console.log(`[IMPORT] upsert products ean=${ean}`);
    const { data: prodRow, error: prodErr } = await supabase
      .from("products")
      .upsert(
        [
          {
            name: dto.product.name,
            brand: dto.product.brand,
            ean: dto.product.ean,
            category: dto.product.category,
            image_url: dto.product.image_url,
            size_value: dto.product.size_value,
            size_unit: dto.product.size_unit,
          },
        ],
        { onConflict: "ean" }
      )
      .select("id")
      .single();

    if (prodErr) {
      console.error("[IMPORT] upsert products error:", prodErr);
      return res.status(500).json({ error: "DB products upsert: " + prodErr.message });
    }
    const product_id = prodRow.id;

    // 3) Upsert nutrition por product_id (requiere unique en nutrition.product_id)
    console.log(`[IMPORT] upsert nutrition product_id=${product_id}`);
    const { error: nutErr } = await supabase
      .from("nutrition")
      .upsert(
        [
          {
            product_id,
            calories_kcal_100g: dto.nutrition.calories_kcal_100g,
            protein_g_100g: dto.nutrition.protein_g_100g,
            fat_g_100g: dto.nutrition.fat_g_100g,
            carbs_g_100g: dto.nutrition.carbs_g_100g,
            sugar_g_100g: dto.nutrition.sugar_g_100g,
            fiber_g_100g: dto.nutrition.fiber_g_100g,
            salt_g_100g: dto.nutrition.salt_g_100g,
            nutriscore_grade: dto.nutrition.nutriscore_grade,
            nova_group: dto.nutrition.nova_group,
            allergens: dto.nutrition.allergens,
            ingredients: dto.nutrition.ingredients,
          },
        ],
        { onConflict: "product_id" }
      );

    if (nutErr) {
      console.error("[IMPORT] upsert nutrition error:", nutErr);
      return res.status(500).json({ error: "DB nutrition upsert: " + nutErr.message });
    }

    console.log(`[IMPORT] OK product_id=${product_id}`);
    return res.json({ ok: true, product_id });
  } catch (e) {
    console.error("[IMPORT] fatal error:", e);
    return res.status(500).json({ error: (e && e.message) ? e.message : String(e) });
  }
});

export default router;
