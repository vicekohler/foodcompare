// server/src/routes/ai.routes.js
import { Router } from "express";
import { supabase } from "../config/db.js";

const router = Router();

/* ================== Config Gemini ================== */

const apiKey = process.env.GEMINI_API_KEY ?? "";

if (!apiKey) {
  console.warn("[AI] GEMINI_API_KEY no está definido en .env");
}

// 👉 Usa un modelo vigente de la Gemini API (2.0 Flash)
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

/* ================== Helper ================== */

/**
 * Llama a Gemini vía HTTP (API v1)
 */
async function callGemini(prompt) {
  if (!apiKey) throw new Error("Gemini no está configurado (falta API KEY)");

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  };

  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    console.error("Gemini HTTP error:", resp.status, resp.statusText, errorText);
    throw new Error(
      `Gemini HTTP ${resp.status} - ${resp.statusText || "Unknown"}`
    );
  }

  const data = await resp.json();

  // Tomamos el texto del primer candidato
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.output ??
    "";

  if (!text) {
    console.error("Gemini sin texto en respuesta:", JSON.stringify(data));
    throw new Error("Gemini no devolvió texto");
  }

  return text;
}

/**
 * Intenta parsear JSON, limpiando posibles ```json ... ``` que a veces mete la IA
 */
function safeParseJson(maybeJson) {
  let cleaned = maybeJson.trim();

  // Remover fences de código si aparecen
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/```$/, "")
      .trim();
  }

  return JSON.parse(cleaned);
}

/* ============================================================
   1) IA SUBSTITUTOS
   ============================================================ */

router.get("/substitutes/:productId", async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    if (!productId) {
      return res.status(400).json({ error: "productId inválido" });
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, brand, category, size_value, size_unit")
      .eq("id", productId)
      .single();

    if (productError) {
      console.error("Supabase error products:", productError);
      return res.status(500).json({ error: "Error al obtener producto" });
    }

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const { data: nutrition, error: nutritionError } = await supabase
      .from("nutrition")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();

    if (nutritionError) {
      console.error("Supabase error nutrition:", nutritionError);
    }

    const prompt = `
Eres un asistente experto en alimentación saludable en Chile.

Debes proponer sustitutos MÁS saludables para el siguiente producto,
manteniendo categoría similar y considerando contexto de supermercado chileno.

DEVUELVE EXCLUSIVAMENTE UN JSON VÁLIDO, sin texto adicional, sin explicaciones
y sin backticks. No incluyas comentarios.

Producto base:
${JSON.stringify(product)}

Nutrición (puede venir vacío):
${nutrition ? JSON.stringify(nutrition) : "{}"}

Estructura EXACTA del JSON de salida:

{
  "product_id": ${product.id},
  "base_name": "${product.name}",
  "substitutes": [
    {
      "name": "string",
      "description": "string",
      "health_reason": "string",
      "price_hint": "string",
      "availability_hint": "string",
      "category": "string"
    }
  ]
}

- "substitutes" debe tener entre 3 y 5 elementos.
- No agregues ningún campo extra.
- No agregues texto fuera del JSON.
`;

    const text = await callGemini(prompt);

    let json;
    try {
      json = safeParseJson(text);
    } catch (err) {
      console.error("Parse JSON error (substitutes):", err, "RAW:", text);
      return res.status(500).json({
        error: "IA entregó un JSON inválido",
        raw: text,
      });
    }

    return res.json({
      ok: true,
      product,
      nutrition,
      ai: json,
    });
  } catch (err) {
    console.error("AI ERROR /substitutes →", err);
    return res.status(500).json({ error: "Error interno con IA" });
  }
});

/* ============================================================
   2) IA CONSEJO NUTRICIONAL
   ============================================================ */

router.post("/nutrition-advice", async (req, res) => {
  try {
    const { product, nutrition, userProfile } = req.body;

    if (!product || !nutrition) {
      return res.status(400).json({
        error: "Debes enviar { product, nutrition }",
      });
    }

    const prompt = `
Eres nutricionista y debes evaluar cuán saludable es este producto
para un consumidor chileno promedio.

DEVUELVE EXCLUSIVAMENTE UN JSON VÁLIDO, sin texto adicional, ni explicaciones,
ni backticks. No incluyas comentarios.

Producto:
${JSON.stringify(product)}

Nutrición:
${JSON.stringify(nutrition)}

Perfil de usuario (puede venir vacío):
${JSON.stringify(userProfile || {})}

Estructura EXACTA del JSON de salida:

{
  "summary": "string",
  "risk_label": "string",
  "health_score": 1,
  "advice": [
    { "title": "string", "text": "string" }
  ]
}

- "health_score" debe ser un entero entre 1 y 5.
- "advice" debe contener entre 2 y 5 recomendaciones.
- No agregues ningún campo extra.
- No agregues texto fuera del JSON.
`;

    const text = await callGemini(prompt);

    let json;
    try {
      json = safeParseJson(text);
    } catch (err) {
      console.error("Parse JSON error (nutrition-advice):", err, "RAW:", text);
      return res.status(500).json({
        error: "IA entregó JSON inválido",
        raw: text,
      });
    }

    return res.json({ ok: true, advice: json });
  } catch (err) {
    console.error("AI Nutrition Error →", err);
    return res.status(500).json({ error: "Error interno IA" });
  }
});

export default router;
