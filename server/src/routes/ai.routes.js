// server/src/routes/ai.routes.js
import { Router } from "express";
import { supabase } from "../config/db.js";

const router = Router();

/* ================== Config Gemini ================== */

const apiKey = process.env.GEMINI_API_KEY ?? "";

if (!apiKey) {
  console.warn("[AI] GEMINI_API_KEY no está definido en .env");
}

// 👉 Modelo vigente Gemini 2.0 Flash
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

/* ================== MULTILENGUAJE ================== */

function getLanguageInstruction(lang = "es") {
  if (lang === "en") {
    return `
Respond STRICTLY in English. 
All summaries, fields and descriptions must be in English.
Do NOT use Spanish under any circumstance.
`.trim();
  }

  if (lang === "pt") {
    return `
Responda ESTRITAMENTE em português brasileiro.
Todos os textos, resumos e descrições devem estar em português.
Não use espanhol em hipótese alguma.
`.trim();
  }

  return `
Responde ESTRICTAMENTE en español.
Todo el JSON, explicaciones y textos deben estar en español.
`.trim();
}

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
    console.error(
      "Gemini HTTP error:",
      resp.status,
      resp.statusText,
      errorText
    );
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

    const lang = req.query.lang || "es";
    const languageInstruction = getLanguageInstruction(lang);

    const prompt = `
${languageInstruction}

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
    const { product, nutrition, userProfile, lang = "es" } = req.body;

    if (!product || !nutrition) {
      return res.status(400).json({
        error: "Debes enviar { product, nutrition }",
      });
    }

    const languageInstruction = getLanguageInstruction(lang);

    const prompt = `
${languageInstruction}

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

/* ============================================================
   3) IA – CHAT GENERAL CON CONTEXTO DEL SUPERMERCADO
   ============================================================ */

router.post("/chat", async (req, res) => {
  try {
    const { messages, lang } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ ok: false, error: "messages inválido" });
    }

    /* ======================================================
       1) Construimos un contexto del dominio FoodCompare
    ====================================================== */

    const langInstr = getLanguageInstruction(lang || "es");

    const systemPrompt = {
      es: `
${langInstr}

Eres un asistente experto en nutrición, compras inteligentes y comparación de productos en supermercados de Chile.

CONTEXTOS QUE DEBES USAR:

1. BASE DE DATOS DEL PRODUCTO:
   - Puedes consultar nombre, categoría, marca, tamaño.
   - Usa información nutricional si está disponible: calorías, grasas, proteínas, azúcar, sal, NOVA, NutriScore.
   - Si no hay nutrición, díselo al usuario.

2. PRECIOS:
   - Puedes sugerir dónde suele ser más barato cada producto, si aparece en la lista.
   - No inventes precios. Basarte solo en los datos que recibes del usuario o de los mensajes previos.

3. ESTILO:
   - Responde en tono amable, simple y útil.
   - Recomienda alternativas más saludables solo si el usuario lo pide.
   - No inventes productos inexistentes.

4. IDIOMA:
   - Responde SIEMPRE en el mismo idioma del usuario.

Cuando respondas: sé breve, práctico y fácil de entender.
`,
      en: `
${langInstr}

You are a nutrition and supermarket shopping assistant specialized in Chile.

Follow these rules:
- Use product names, categories, and nutrition data when available.
- If data is missing, say so.
- Give healthier alternatives ONLY if asked.
- Never invent prices.
- Always reply in the requested language.
`,
      pt: `
${langInstr}

Você é um assistente de nutrição e compras no supermercado no Chile.

Regras:
- Use informações reais dos produtos quando disponíveis.
- Se faltar algo, informe.
- Forneça alternativas saudáveis apenas se solicitado.
- Nunca invente preços.
- Responda sempre no idioma solicitado.
`,
    }[lang || "es"];

    /* ======================================================
       2) Construcción del prompt completo para Gemini
    ====================================================== */

    const prompt = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      ],
    };

    /* ======================================================
       3) Llamada real a Gemini
    ====================================================== */

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const respGem = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prompt),
    });

    if (!respGem.ok) {
      const errText = await respGem.text();
      console.error("Chat Gemini error:", errText);
      return res.status(500).json({ ok: false, error: "Error IA" });
    }

    const data = await respGem.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.output ||
      "";

    return res.json({ ok: true, reply });
  } catch (err) {
    console.error("AI Chat Error →", err);
    return res.status(500).json({ ok: false, error: "Error interno IA" });
  }
});

export default router;
