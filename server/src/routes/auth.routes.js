// server/src/routes/auth.routes.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/db.js";

const router = Router();

// 🔹 MISMO SECRET QUE EN authJwt.js
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-foodcompare";

// Rate-limit básico por email para login
const loginAttempts = new Map(); // key: email norm -> { count, lockUntil }
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

// Normaliza email
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// Valida contraseña fuerte
function isStrongPassword(password) {
  const pw = String(password || "");
  if (pw.length < 8) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}

// Middleware JWT
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const [type, token] = auth.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token faltante o inválido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded; // { id, email, name, iat, exp }
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

async function findUserById(id) {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, name, last_name, phone, provider, avatar_url, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * POST /api/auth/signup
 * Body: { name, last_name, email, password, phone?, avatar_url? }
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, last_name, email, password, phone, avatar_url } = req.body || {};

    if (!name || !last_name || !email || !password) {
      return res.status(400).json({
        error: "Nombre, apellido, email y contraseña son obligatorios",
      });
    }

    // Validación de contraseña fuerte
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "La contraseña debe tener mínimo 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.",
      });
    }

    const normEmail = normalizeEmail(email);

    // ¿Email ya existe?
    const { data: existing, error: findErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", normEmail)
      .maybeSingle();

    if (findErr) {
      console.error("Error buscando usuario:", findErr);
      return res.status(500).json({ error: "Error buscando usuario" });
    }

    if (existing) {
      return res
        .status(409)
        .json({ error: "Ya existe una cuenta con ese email" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const cleanPhone =
      typeof phone === "string" && phone.trim().length > 0
        ? phone.trim()
        : null;

    const cleanAvatar =
      typeof avatar_url === "string" && avatar_url.trim().length > 0
        ? avatar_url.trim()
        : null;

    const { data: user, error: insertErr } = await supabase
      .from("users")
      .insert([
        {
          email: normEmail,
          password_hash: passwordHash,
          name: String(name).trim(),
          last_name: String(last_name).trim(),
          provider: "local",
          phone: cleanPhone,
          avatar_url: cleanAvatar,
        },
      ])
      .select(
        "id, email, name, last_name, provider, phone, avatar_url, created_at"
      )
      .single();

    if (insertErr) {
      console.error("Error insertando usuario:", insertErr);
      return res.status(500).json({ error: "No se pudo crear la cuenta" });
    }

    return res.status(201).json({
      message: "Cuenta creada correctamente",
      user,
    });
  } catch (err) {
    console.error("Error en /auth/signup:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email y contraseña son obligatorios" });
    }

    const normEmail = normalizeEmail(email);

    // Rate-limit por email
    const now = Date.now();
    const entry = loginAttempts.get(normEmail) || { count: 0, lockUntil: 0 };

    if (entry.lockUntil && now < entry.lockUntil) {
      const remainingMs = entry.lockUntil - now;
      const remainingMin = Math.ceil(remainingMs / 60000);
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Vuelve a intentar en aproximadamente ${remainingMin} minuto(s).`,
      });
    }

    const { data: user, error: findErr } = await supabase
      .from("users")
      .select(
        "id, email, password_hash, name, last_name, provider, phone, avatar_url, created_at"
      )
      .eq("email", normEmail)
      .eq("provider", "local")
      .maybeSingle();

    if (findErr) {
      console.error("Error buscando usuario en login:", findErr);
      return res.status(500).json({ error: "Error buscando usuario" });
    }

    if (!user) {
      // Usuario no existe
      entry.count += 1;
      if (entry.count >= MAX_ATTEMPTS) {
        entry.lockUntil = now + LOCK_MINUTES * 60 * 1000;
      }
      loginAttempts.set(normEmail, entry);

      if (entry.lockUntil && now < entry.lockUntil) {
        return res.status(429).json({
          error:
            "Demasiados intentos fallidos. La cuenta se bloqueó temporalmente. Intenta nuevamente en unos minutos.",
        });
      }

      return res.status(404).json({ error: "Usuario no registrado" });
    }

    const ok = await bcrypt.compare(
      String(password),
      user.password_hash || ""
    );

    if (!ok) {
      // Contraseña incorrecta
      entry.count += 1;
      if (entry.count >= MAX_ATTEMPTS) {
        entry.lockUntil = now + LOCK_MINUTES * 60 * 1000;
      }
      loginAttempts.set(normEmail, entry);

      if (entry.lockUntil && now < entry.lockUntil) {
        return res.status(429).json({
          error:
            "Demasiados intentos fallidos. La cuenta se bloqueó temporalmente. Intenta nuevamente en unos minutos.",
        });
      }

      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    // Login OK → limpiar intentos
    loginAttempts.delete(normEmail);

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    // 🔹 Firmar con el mismo SECRET
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      last_name: user.last_name,
      provider: user.provider,
      phone: user.phone,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    };

    return res.json({
      message: "Login correcto",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("Error en /auth/login:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * GET /api/auth/me
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // El frontend acepta { user } o el objeto directo
    return res.json(user);
  } catch (err) {
    console.error("Error en GET /auth/me:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

/**
 * PUT /api/auth/me
 * Body: { name?, last_name?, phone?, avatar_url? }
 */
router.put("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.auth.id;
    const { name, last_name, phone, avatar_url } = req.body || {};

    const updatePayload = {};

    if (typeof name === "string" && name.trim()) {
      updatePayload.name = name.trim();
    }

    if (typeof last_name === "string" && last_name.trim()) {
      updatePayload.last_name = last_name.trim();
    }

    if (typeof phone === "string") {
      updatePayload.phone = phone.trim() || null;
    }

    if (typeof avatar_url === "string") {
      updatePayload.avatar_url = avatar_url.trim() || null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }

    const { data, error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId)
      .select(
        "id, email, name, last_name, phone, provider, avatar_url, created_at"
      )
      .single();

    if (error) {
      console.error("Error actualizando perfil:", error);
      return res.status(500).json({ error: "No se pudo actualizar el perfil" });
    }

    // El frontend acepta { user } o el objeto directo
    return res.json(data);
  } catch (err) {
    console.error("Error en PUT /auth/me:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/login-oauth", async (req, res) => {
  try {
    const { provider, supabase_user_id, email, name, avatar_url } = req.body || {};

    if (!provider || provider !== "google") {
      return res.status(400).json({ error: "Proveedor OAuth inválido" });
    }

    if (!email || !supabase_user_id) {
      return res
        .status(400)
        .json({ error: "Faltan datos obligatorios de OAuth (email o id)" });
    }

    const normEmail = normalizeEmail(email);

    // Buscamos usuario por email
    const { data: existing, error: findErr } = await supabase
      .from("users")
      .select(
        "id, email, name, last_name, provider, phone, avatar_url, created_at"
      )
      .eq("email", normEmail)
      .maybeSingle();

    if (findErr) {
      console.error("Error buscando usuario en login-oauth:", findErr);
      return res.status(500).json({ error: "Error buscando usuario" });
    }

    let userRecord = existing;

    // Si no existe → lo creamos
    if (!userRecord) {
      const { data: inserted, error: insertErr } = await supabase
        .from("users")
        .insert([
          {
            email: normEmail,
            name: name ? String(name).trim() : null,
            last_name: null,
            provider: "google",
            phone: null,
            avatar_url: avatar_url || null,
            // podrías agregar columna supabase_user_id si la creas en la tabla
          },
        ])
        .select(
          "id, email, name, last_name, provider, phone, avatar_url, created_at"
        )
        .single();

      if (insertErr) {
        console.error("Error insertando usuario en login-oauth:", insertErr);
        return res.status(500).json({ error: "No se pudo crear el usuario OAuth" });
      }

      userRecord = inserted;
    } else {
      // Si existe, opcionalmente actualizamos provider y avatar_url
      const updatePayload = {};
      if (userRecord.provider !== "google") {
        updatePayload.provider = "google";
      }
      if (avatar_url && userRecord.avatar_url !== avatar_url) {
        updatePayload.avatar_url = avatar_url;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { data: updated, error: updErr } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", userRecord.id)
          .select(
            "id, email, name, last_name, provider, phone, avatar_url, created_at"
          )
          .single();

        if (updErr) {
          console.error("Error actualizando usuario en login-oauth:", updErr);
          return res
            .status(500)
            .json({ error: "No se pudo actualizar el usuario OAuth" });
        }

        userRecord = updated;
      }
    }

    // Generamos tu JWT igual que en /login
    const payload = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    const safeUser = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      last_name: userRecord.last_name,
      provider: userRecord.provider,
      phone: userRecord.phone,
      avatar_url: userRecord.avatar_url,
      created_at: userRecord.created_at,
    };

    return res.json({
      message: "Login OAuth correcto",
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error("Error en /auth/login-oauth:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
