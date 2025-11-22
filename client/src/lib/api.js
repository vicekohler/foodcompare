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

/**
 * Lista de productos para el Home
 * Backend: GET /api/products -> { ok: true, items: [...] }
 */
export async function fetchProducts() {
  const data = await safeFetch("/products");

  if (!data || !Array.isArray(data.items)) {
    console.warn("Respuesta inesperada en /api/products:", data);
    return [];
  }
  return data.items;
}

/**
 * Detalle de producto
 * (por ahora volvemos a llamar /api/products y filtramos localmente)
 */
export async function fetchProductById(id) {
  if (!id) return null;

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

/**
 * Precios por supermercado de un producto
 * Backend: GET /api/prices/by-product/:productId
 * Respuesta: { product, prices: [...] }
 */
export async function fetchPricesByProductId(id) {
  if (!id) return [];

  const data = await safeFetch(`/prices/by-product/${id}`);

  if (!data || !Array.isArray(data.prices)) {
    console.warn("Respuesta inesperada en /api/prices/by-product:", data);
    return [];
  }
  return data.prices;
}

/**
 * Comparación de precios (mejor precio)
 * Backend: GET /api/prices/compare/:productId
 * Respuesta: { product, best, prices, params }
 */
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

/**
 * Signup
 * Backend: POST /api/auth/signup
 * Body: { name, email, password }
 * Devuelve: { ok, status, data, error }
 * (Puedes usarlo o seguir usando tu fetch directo en Signup.jsx;
 *  no choca con nada.)
 */
export async function signupRequest({ name, email, password }) {
  const url = `${API_URL}/auth/signup`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
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

/**
 * Login
 * Backend: POST /api/auth/login
 * Body: { email, password }
 *
 * IMPORTANTE:
 * Devuelve SIEMPRE un objeto con esta forma:
 *  - { ok: false, status, error }  en error
 *  - { ok: true, status, user, token } en éxito
 *
 * Esto es exactamente lo que tu Login.jsx está esperando.
 */
export async function loginRequest({ email, password }) {
  const url = `${API_URL}/auth/login`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage =
        data?.error || data?.message || `HTTP ${res.status}`;
      console.error("Login error:", res.status, data);
      return {
        ok: false,
        status: res.status,
        error: errorMessage,
        user: null,
        token: null,
      };
    }

    // Intentamos ser tolerantes con el formato del backend
    const rawUser = data?.user || data?.data?.user || null;
    const rawToken =
      data?.token || data?.data?.token || data?.access_token || null;

    return {
      ok: true,
      status: res.status,
      user: rawUser,
      token: rawToken,
      error: null,
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
