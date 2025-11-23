// server/src/routes/prices.routes.js
import { Router } from "express";
import { supabase } from "../config/db.js";

const router = Router();

/* ============ Helpers ============ */

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

/* ============ Endpoints ============ */

/**
 * POST /api/prices
 * Upsert por (product_id, store_id)
 * body: { product_id, store_id, price, currency?, url?, promo_text?, captured_at?, expires_at?, source?, source_ref? }
 */
router.post("/", async (req, res) => {
  try {
    const { product_id, store_id, price } = req.body;
    if (!product_id || !store_id || price == null) {
      return res.status(400).json({ error: "Faltan product_id, store_id o price" });
    }
    if (isNaN(Number(price))) return res.status(400).json({ error: "price debe ser numérico" });

    // payload completo (incluye fuente)
    const payload = {
      price: Number(price),
      currency: req.body.currency || "CLP",
      url: req.body.url || null,
      promo_text: req.body.promo_text || null,
      captured_at: req.body.captured_at || new Date().toISOString(),
      expires_at: req.body.expires_at || null,
      source: req.body.source || "manual",
      source_ref: req.body.source_ref || null,
      updated_at: new Date().toISOString(),
    };

    // existe?
    const { data: existing } = await supabase
      .from("prices")
      .select("id")
      .eq("product_id", product_id)
      .eq("store_id", store_id)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from("prices")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ upserted: true, ...data });
    }

    const { data, error } = await supabase
      .from("prices")
      .insert([{ product_id, store_id, ...payload }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ upserted: false, ...data });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * GET /api/prices/by-product/:productId
 * Lista precios para un producto con $/100 y datos de tienda.
 */
router.get("/by-product/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ error: "productId inválido" });

    const { data: product, error: e1 } = await supabase
      .from("products")
      .select("id, name, size_value, size_unit")
      .eq("id", productId)
      .single();
    if (e1) return res.status(404).json({ error: e1.message });

    const { data: prices, error: e2 } = await supabase
      .from("prices")
      .select("id, price, currency, url, promo_text, captured_at, expires_at, store_id, stores(name, logo_url)")
      .eq("product_id", productId)
      .order("price", { ascending: true });
    if (e2) return res.status(500).json({ error: e2.message });

    const mapped = (prices || []).map((p) => ({
      id: p.id,
      store_id: p.store_id,
      store_name: p.stores?.name || null,
      store_logo: p.stores?.logo_url || null,
      price: p.price,
      currency: p.currency,
      url: p.url,
      promo_text: p.promo_text,
      captured_at: p.captured_at,
      expires_at: p.expires_at,
      normalized_price: getNormalizedPrice(product, p.price),
      stale: isStale(p.captured_at),
      expired: isExpired(p.expires_at),
    }));

    return res.json({ product, prices: mapped });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * GET /api/prices/compare/:productId
 * Devuelve el “ganador” (menor $/100) y todas las alternativas ordenadas.
 * Query:
 *   ?staleHours=48
 *   ?hideExpired=1
 *   ?preferFresh=1
 */
router.get("/compare/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ error: "productId inválido" });

    const staleHours = Number(req.query.staleHours ?? 48);
    const hideExpired = String(req.query.hideExpired ?? "1") === "1";
    const preferFresh = String(req.query.preferFresh ?? "1") === "1";

    const { data: product, error: e1 } = await supabase
      .from("products")
      .select("id, name, size_value, size_unit")
      .eq("id", productId)
      .single();
    if (e1) return res.status(404).json({ error: e1.message });

    const { data: prices, error: e2 } = await supabase
      .from("prices")
      .select("id, price, currency, url, promo_text, captured_at, expires_at, store_id, stores(name, logo_url)")
      .eq("product_id", productId);
    if (e2) return res.status(500).json({ error: e2.message });

    let enriched = (prices || []).map((p) => {
      const normalized = getNormalizedPrice(product, p.price);
      const stale = isStale(p.captured_at, staleHours);
      const expired = isExpired(p.expires_at);
      return {
        id: p.id,
        store_id: p.store_id,
        store_name: p.stores?.name || null,
        store_logo: p.stores?.logo_url || null,
        price: p.price,
        currency: p.currency,
        url: p.url,
        promo_text: p.promo_text,
        captured_at: p.captured_at,
        expires_at: p.expires_at,
        normalized_price: normalized,
        stale,
        expired,
      };
    });

    // limpiar
    enriched = enriched.filter((x) => x.normalized_price != null);
    if (hideExpired) enriched = enriched.filter((x) => !x.expired);

    // ordenar
    enriched.sort((a, b) => {
      if (a.normalized_price !== b.normalized_price) {
        return a.normalized_price - b.normalized_price;
      }
      if (preferFresh && a.stale !== b.stale) return a.stale ? 1 : -1;
      if (a.price !== b.price) return a.price - b.price;
      return a.id - b.id;
    });

    const best = enriched[0] || null;

    return res.json({
      product,
      best,
      prices: enriched,
      params: { staleHours, hideExpired, preferFresh }
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * GET /api/prices/history/:productId?storeId=&limit=
 * Devuelve historial para gráficos.
 */
router.get("/history/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const storeId = req.query.storeId ? Number(req.query.storeId) : null;
    const limit = req.query.limit ? Number(req.query.limit) : 200;

    if (!productId) return res.status(400).json({ error: "productId inválido" });

    let q = supabase
      .from("price_history")
      .select("product_id, store_id, price, currency, promo_text, url, captured_at")
      .eq("product_id", productId)
      .order("captured_at", { ascending: false })
      .limit(limit);

    if (storeId) q = q.eq("store_id", storeId);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/** Debug simple */
router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("prices")
    .select("id, product_id, store_id, price, currency, url, promo_text, recorded_at, captured_at, expires_at, updated_at, source, source_ref")
    .order("id", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

/** Delete */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });
    const { error } = await supabase.from("prices").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ================== Cotización de carrito por supermercado ==================
//
// POST /api/prices/quote
// body: { items: [ { product_id, qty } ] }
//
// Devuelve:
// {
//   by_store: [
//     { store_id, store_name, store_logo, total }
//   ],
//   best_store: { store_id, store_name, store_logo, total } | null
// }
router.post("/quote", async (req, res) => {
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    if (!items.length) {
      return res.status(400).json({ error: "Se requiere items con product_id y qty" });
    }

    // 1) Normalizar items → product_id -> qty total
    const qtyMap = new Map(); // product_id -> qty
    for (const it of items) {
      const pid = Number(it.product_id || it.id);
      const q = Number(it.qty || it.quantity || 0);
      if (!pid || !q) continue;
      qtyMap.set(pid, (qtyMap.get(pid) || 0) + q);
    }

    const productIds = [...qtyMap.keys()];
    if (!productIds.length) {
      return res.status(400).json({ error: "items sin product_id válido" });
    }

    // 2) Traer todos los precios para esos productos, por supermercado
    const { data: rows, error } = await supabase
      .from("prices")
      .select(`
        product_id,
        store_id,
        price,
        stores ( id, name, logo_url )
      `)
      .in("product_id", productIds);

    if (error) throw error;
    if (!rows || !rows.length) {
      return res.json({ by_store: [], best_store: null });
    }

    // 3) Mapear product -> (store -> price) y metadata de tiendas
    const productStorePrices = new Map(); // pid -> Map(store_id -> price)
    const storesInfo = new Map(); // store_id -> { store_id, store_name, store_logo }

    for (const r of rows) {
      const pid = r.product_id;
      const sid = r.store_id;

      if (!productStorePrices.has(pid)) {
        productStorePrices.set(pid, new Map());
      }
      productStorePrices.get(pid).set(sid, r.price);

      if (!storesInfo.has(sid)) {
        storesInfo.set(sid, {
          store_id: sid,
          store_name: r.stores?.name ?? null,
          store_logo: r.stores?.logo_url ?? null,
        });
      }
    }

    // 4) Solo consideramos supermercados que tengan precio para TODOS los productos del carrito
    const candidates = [];

    for (const [sid, info] of storesInfo.entries()) {
      let ok = true;
      let total = 0;

      for (const [pid, qty] of qtyMap.entries()) {
        const storePrices = productStorePrices.get(pid);
        const pr = storePrices?.get(sid);
        if (pr == null) {
          ok = false;
          break;
        }
        total += pr * qty;
      }

      if (ok) {
        candidates.push({
          ...info,
          total,
        });
      }
    }

    if (!candidates.length) {
      return res.json({ by_store: [], best_store: null });
    }

    candidates.sort((a, b) => a.total - b.total);
    const best_store = candidates[0];

    return res.json({
      by_store: candidates,
      best_store,
    });
  } catch (err) {
    console.error("POST /prices/quote error:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});


export default router;
