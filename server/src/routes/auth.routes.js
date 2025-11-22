// server/src/routes/auth.routes.js
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-foodcompare";

// Normaliza email
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Nombre, email y contraseña son obligatorios" });
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

    const { data: user, error: insertErr } = await supabase
      .from("users")
      .insert([
        {
          email: normEmail,
          password_hash: passwordHash,
          name: String(name).trim(),
          provider: "local",
        },
      ])
      .select("id, email, name, provider")
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

    const { data: user, error: findErr } = await supabase
      .from("users")
      .select("id, email, password_hash, name, provider")
      .eq("email", normEmail)
      .eq("provider", "local")
      .maybeSingle();

    if (findErr) {
      console.error("Error buscando usuario en login:", findErr);
      return res.status(500).json({ error: "Error buscando usuario" });
    }

    if (!user) {
      // No revelar si es email o password
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const ok = await bcrypt.compare(
      String(password),
      user.password_hash || ""
    );

    if (!ok) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      message: "Login correcto",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
    });
  } catch (err) {
    console.error("Error en /auth/login:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
