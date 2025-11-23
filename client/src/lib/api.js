// client/src/lib/api.js

// Siempre usamos la API con prefijo /api
export const API_URL = "http://localhost:4000/api";

/**
 * Wrapper genérico que devuelve directamente el JSON (o null en error).
 * Úsalo para endpoints tipo "data" (productos, precios, etc.).
 */
async function safeFetch(path, options = {}) {
  const url = `${API_URL}${path}`;

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.error("Error HTTP:", res.status, url);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Error de red:", url, err);
    return null;
  }
}

/* =========================
 *  PRODUCTOS
 * ========================= */

export async function fetchProducts() {
  const data = await safeFetch("/products");

  if (!data || !Array.isArray(data.items)) {
    console.warn("Respuesta inesperada en /api/products:", data);
    return [];
  }
  return data.items;
}

export async function fetchProductById(id) {
  if (!id) return null;

  // Por compatibilidad con tu backend actual, reutilizamos /products
  const data = await safeFetch("/products");
  if (!data || !Array.isArray(data.items)) return null;

  const numId = Number(id);
  const product = data.items.find((p) => p.id === numId);

  if (!product) {
    console.warn("No se encontró producto con id", id);
    return null;
  }
  return product;
}

/* =========================
 *  PRECIOS
 * ========================= */

export async function fetchPricesByProductId(id) {
  if (!id) return [];

  const data = await safeFetch(`/prices/by-product/${id}`);

  if (!data || !Array.isArray(data.prices)) {
    console.warn("Respuesta inesperada en /api/prices/by-product:", data);
    return [];
  }
  return data.prices;
}

export async function fetchBestPriceComparison(id) {
  if (!id) return null;

  const data = await safeFetch(`/prices/compare/${id}`);

  if (!data || !data.product) {
    console.warn("Respuesta inesperada en /api/prices/compare:", data);
    return null;
  }
  return data;
}

/* =========================
 *  AUTENTICACIÓN
 * ========================= */

export async function signupRequest({
  name,
  lastName,
  email,
  password,
  phone,
  avatarUrl,
}) {
  const url = `${API_URL}/auth/signup`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        last_name: lastName,
        email,
        password,
        phone: phone || null,
        avatar_url: avatarUrl || null,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage =
        data?.error || data?.message || `HTTP ${res.status}`;
      console.error("Signup error:", res.status, data);
      return { ok: false, status: res.status, data, error: errorMessage };
    }

    return { ok: true, status: res.status, data, error: null };
  } catch (err) {
    console.error("Error de red en signupRequest:", err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: "Error de conexión con el servidor",
    };
  }
}

export async function loginRequest({ email, password }) {
  const url = `${API_URL}/auth/login`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage =
        body?.error || body?.message || `HTTP ${res.status}`;
      console.error("Login error:", res.status, body);
      return {
        ok: false,
        status: res.status,
        error: errorMessage,
        user: null,
        token: null,
      };
    }

    let user = null;
    let token = null;

    if (body?.user && body?.token) {
      user = body.user;
      token = body.token;
    } else if (body?.data?.user && body?.data?.token) {
      user = body.data.user;
      token = body.data.token;
    } else if (body?.token && (body?.email || body?.id)) {
      user = {
        id: body.id ?? null,
        email: body.email ?? email,
        name: body.name ?? null,
      };
      token = body.token;
    }

    if (!user || !token) {
      console.error("loginRequest: respuesta sin user/token", body);
      return {
        ok: false,
        status: res.status,
        error: "Respuesta inválida del servidor",
        user: null,
        token: null,
      };
    }

    return {
      ok: true,
      status: res.status,
      error: null,
      user,
      token,
    };
  } catch (err) {
    console.error("Error de red en loginRequest:", err);
    return {
      ok: false,
      status: 0,
      error: "Error de conexión con el servidor",
      user: null,
      token: null,
    };
  }
}

/* =========================
 *  PERFIL
 * ========================= */

export async function fetchProfile(token) {
  const url = `${API_URL}/auth/me`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage = body?.error || body?.message || `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: errorMessage, data: null };
    }

    return {
      ok: true,
      status: res.status,
      data: body?.user || body,
      error: null,
    };
  } catch (err) {
    console.error("Error de red en fetchProfile:", err);
    return { ok: false, status: 0, data: null, error: "Red" };
  }
}

export async function updateProfile(token, payload) {
  const url = `${API_URL}/auth/me`;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage = body?.error || body?.message || `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: errorMessage, data: null };
    }

    return {
      ok: true,
      status: res.status,
      data: body?.user || body,
      error: null,
    };
  } catch (err) {
    console.error("Error de red en updateProfile:", err);
    return { ok: false, status: 0, error: "Red", data: null };
  }
}

/* =========================
 *  AVATAR
 * ========================= */

export async function uploadAvatar(token, file) {
  const url = `${API_URL}/upload/avatar`;

  const formData = new FormData();
  formData.append("avatar", file);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.url) {
      const errorMessage = body?.error || body?.message || `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: errorMessage, url: null };
    }

    return { ok: true, status: res.status, url: body.url, error: null };
  } catch (err) {
    console.error("uploadAvatar error:", err);
    return { ok: false, status: 0, error: "Red", url: null };
  }
}

/* =========================
 *  NUTRICIÓN
 * ========================= */

export async function fetchNutritionByProductId(productId) {
  if (!productId) return null;

  const url = `${API_URL}/products/${productId}/nutrition`;

  try {
    const res = await fetch(url);
    if (res.status === 404) return null;

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    return data;
  } catch (err) {
    console.error("Error de red en fetchNutrition:", err);
    return null;
  }
}

export async function importNutritionFromOFF(productId) {
  if (!productId) return { ok: false, error: "Falta productId" };

  const url = `${API_URL}/openfoodfacts/products/${productId}/fetch-nutrition}`;

  try {
    const res = await fetch(url, { method: "POST" });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: body?.error || `HTTP ${res.status}`,
        data: body,
      };
    }

    return { ok: true, status: res.status, data: body, error: null };
  } catch (err) {
    console.error("importNutrition error:", err);
    return { ok: false, status: 0, error: "Red", data: null };
  }
}

/* =========================
 *  BUSCADOR
 * ========================= */

export async function searchProducts(query) {
  const data = await safeFetch(
    `/products/search?q=${encodeURIComponent(query)}`
  );
  return Array.isArray(data) ? data : [];
}

/* =========================
 *  CATEGORÍAS
 * ========================= */

export async function fetchCategories() {
  const data = await safeFetch(`/products/categories/list`);
  return data?.categories ?? [];
}

/* =========================
 *  COTIZACIÓN CARRITO
 * ========================= */

export async function fetchCartQuote(items) {
  const url = `${API_URL}/prices/quote`;

  try {
    const payloadItems = (items || []).map((it) => ({
      product_id: it.product_id || it.id,
      qty: it.qty || it.quantity || 1,
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payloadItems }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("fetchCartQuote error:", res.status, data);
      return null;
    }

    return data;
  } catch (err) {
    console.error("fetchCartQuote network error:", err);
    return null;
  }
}

/* =========================
 *  IA – ACTUALIZADO
 * ========================= */

/**
 * GET /api/ai/substitutes/:productId
 */
export async function fetchAiSubstitutes(productId, lang = "es") {
  const url = `${API_URL}/ai/substitutes/${productId}?lang=${encodeURIComponent(
    lang
  )}`;

  try {
    const res = await fetch(url);

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json?.error || `HTTP ${res.status}`,
      };
    }

    return json;
  } catch (err) {
    console.error("fetchAiSubstitutes error:", err);
    return {
      ok: false,
      status: 0,
      error: "Error de conexión con el servidor (IA)",
    };
  }
}

/**
 * POST /api/ai/nutrition-advice
 * Body: { product, nutrition, userProfile, lang }
 * Soporta i18n: lang = "es" | "en" | "pt"
 */
export async function fetchAiNutritionAdvice({
  product,
  nutrition,
  lang = "es",
  userProfile = null,
}) {
  const url = `${API_URL}/ai/nutrition-advice`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, nutrition, userProfile, lang }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: body?.error || `HTTP ${res.status}`,
        advice: null,
      };
    }

    return {
      ok: body?.ok ?? true,
      status: res.status,
      error: null,
      advice: body?.advice ?? null,
    };
  } catch (err) {
    console.error("fetchAiNutritionAdvice network error:", err);
    return {
      ok: false,
      status: 0,
      error: "Error de conexión con el servidor (IA)",
      advice: null,
    };
  }
}
