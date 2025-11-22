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

/**
 * Signup
 * Backend: POST /api/auth/signup
 * Body: { name, last_name, email, password, phone? }
 * Devuelve: { ok, status, data, error }
 */
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

/**
 * Login
 */
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
 *  PERFIL DE USUARIO
 * ========================= */

export async function fetchProfile(token) {
  const url = `${API_URL}/auth/me`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json().catch(() => null);
    console.log("fetchProfile /auth/me body:", body);

    if (!res.ok) {
      const errorMessage = body?.error || body?.message || `HTTP ${res.status}`;
      return {
        ok: false,
        status: res.status,
        error: errorMessage,
        data: null,
      };
    }

    const user = body?.user || body;
    return {
      ok: true,
      status: res.status,
      error: null,
      data: user,
    };
  } catch (err) {
    console.error("Error de red en fetchProfile:", err);
    return {
      ok: false,
      status: 0,
      error: "Error de conexión con el servidor",
      data: null,
    };
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
    console.log("updateProfile /auth/me body:", body);

    if (!res.ok) {
      const errorMessage = body?.error || body?.message || `HTTP ${res.status}`;
      return {
        ok: false,
        status: res.status,
        error: errorMessage,
        data: null,
      };
    }

    const user = body?.user || body;
    return {
      ok: true,
      status: res.status,
      error: null,
      data: user,
    };
  } catch (err) {
    console.error("Error de red en updateProfile:", err);
    return {
      ok: false,
      status: 0,
      error: "Error de conexión con el servidor",
      data: null,
    };
  }
}

/* =========================
 *  UPLOAD AVATAR
 * ========================= */

/**
 * POST /api/upload/avatar
 * Header: Authorization: Bearer <token>
 * Body: multipart/form-data con campo "avatar"
 * Respuesta: { ok, url }
 */
export async function uploadAvatar(token, file) {
  const url = `${API_URL}/upload/avatar`;

  const formData = new FormData();
  formData.append("avatar", file);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // NO ponemos Content-Type, lo maneja el navegador
      },
      body: formData,
    });

    const body = await res.json().catch(() => null);
    console.log("uploadAvatar resp:", body);

    if (!res.ok || !body?.url) {
      const errorMessage = body?.error || body?.message || `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: errorMessage, url: null };
    }

    return { ok: true, status: res.status, error: null, url: body.url };
  } catch (err) {
    console.error("Error de red en uploadAvatar:", err);
    return {
      ok: false,
      status: 0,
      error: "Error de conexión con el servidor",
      url: null,
    };
  }
}

/* =========================
 *  NUTRICIÓN
 * ========================= */

/**
 * GET /api/products/:id/nutrition
 * Devuelve la fila de "nutrition" para ese producto, o null si no hay.
 */
export async function fetchNutritionByProductId(productId) {
  if (!productId) return null;

  const url = `${API_URL}/products/${productId}/nutrition`;

  try {
    const res = await fetch(url);
    if (res.status === 404) {
      // Producto sin nutrición todavía
      return null;
    }
    if (!res.ok) {
      console.error("Error HTTP en fetchNutritionByProductId:", res.status);
      return null;
    }
    const data = await res.json().catch(() => null);
    return data;
  } catch (err) {
    console.error("Error de red en fetchNutritionByProductId:", err);
    return null;
  }
}

/**
 * POST /api/openfoodfacts/products/:id/fetch-nutrition
 * Llama a OFF desde el backend y hace upsert en "nutrition" para product_id = id.
 */
export async function importNutritionFromOFF(productId) {
  if (!productId) {
    return {
      ok: false,
      status: 0,
      error: "Falta productId",
      data: null,
    };
  }

  const url = `${API_URL}/openfoodfacts/products/${productId}/fetch-nutrition`;

  try {
    const res = await fetch(url, {
      method: "POST",
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMessage = body?.error || `HTTP ${res.status}`;
      console.error("importNutritionFromOFF error:", res.status, body);
      return {
        ok: false,
        status: res.status,
        error: errorMessage,
        data: body,
      };
    }

    return {
      ok: true,
      status: res.status,
      error: null,
      data: body,
    };
  } catch (err) {
    console.error("Error de red en importNutritionFromOFF:", err);
    return {
      ok: false,
      status: 0,
      error: "Error de conexión con el servidor",
      data: null,
    };
  }
}
