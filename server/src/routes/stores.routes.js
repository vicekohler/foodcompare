// server/src/routes/stores.routes.js
import { Router } from "express";
import { supabase } from "../config/db.js";

const router = Router();

/**
 * GET /api/stores
 * Lista todas las tiendas
 */
router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("id", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * POST /api/stores
 * Crea una tienda
 * body: { name: string, logo_url?: string }
 */
router.post("/", async (req, res) => {
  try {
    const { name, logo_url } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "El campo 'name' es obligatorio" });
    }

    const { data, error } = await supabase
      .from("stores")
      .insert([{ name: name.trim(), logo_url: logo_url || null }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * (Opcional) PUT /api/stores/:id
 * Actualiza una tienda
 */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, logo_url } = req.body;

    if (!id) return res.status(400).json({ error: "ID inválido" });
    if (!name) return res.status(400).json({ error: "El campo 'name' es obligatorio" });

    const { data, error } = await supabase
      .from("stores")
      .update({ name: name.trim(), logo_url: logo_url ?? null })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * (Opcional) DELETE /api/stores/:id
 * Elimina una tienda
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(204).send(); // No Content
  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

export default router;
