// src/pages/ProductDetail.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  fetchProductById,
  fetchPricesByProductId,
  fetchNutritionByProductId,
  importNutritionFromOFF,
  fetchAiSubstitutes,
  fetchAiNutritionAdvice,
} from "../lib/api";
import useCartStore from "../store/useCartStore";
import { useI18n } from "../i18n/I18nContext";

export default function ProductDetail() {
  const { id } = useParams();
  const addToCart = useCartStore((s) => s.addItem);
  const { lang } = useI18n();

  const [product, setProduct] = useState(null);
  const [prices, setPrices] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [nutrition, setNutrition] = useState(null);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState("");

  // IA – sustitutos
  const [aiSubsLoading, setAiSubsLoading] = useState(false);
  const [aiSubsError, setAiSubsError] = useState("");
  const [aiSubs, setAiSubs] = useState([]);

  // IA – recomendación nutricional
  const [aiAdviceLoading, setAiAdviceLoading] = useState(false);
  const [aiAdviceError, setAiAdviceError] = useState("");
  const [aiAdvice, setAiAdvice] = useState("");

  // Cargar producto + precios + nutrición
  useEffect(() => {
    async function load() {
      const p = await fetchProductById(id);
      setProduct(p);

      const pr = await fetchPricesByProductId(id);
      setPrices(pr);
      if (pr && pr.length > 0) {
        setSelectedStoreId(pr[0].store_id);
      }

      // Nutrición
      try {
        setLoadingNutrition(true);
        setNutritionError("");
        const n = await fetchNutritionByProductId(id);
        setNutrition(n);
      } catch (err) {
        console.error("Error cargando nutrición:", err);
        setNutrition(null);
        setNutritionError("No se pudo cargar la información nutricional.");
      } finally {
        setLoadingNutrition(false);
      }

      // Reset IA al cambiar de producto
      setAiSubs([]);
      setAiSubsError("");
      setAiAdvice("");
      setAiAdviceError("");
    }
    load();
  }, [id]);

  if (!product) {
    return (
      <div className="pt-32 text-center text-red-400">
        Cargando producto...
      </div>
    );
  }

  const selectedStore =
    prices.find((p) => p.store_id === selectedStoreId) || prices[0] || null;

  function handleAdd() {
    if (!selectedStore) return;

    addToCart({
      id: product.id,
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      size_value: product.size_value,
      size_unit: product.size_unit,
      qty: quantity,
      unit_price: selectedStore.price ?? 0,
      store_id: selectedStore.store_id,
      store_name: selectedStore.store_name,
      store_logo: selectedStore.store_logo,
    });
  }

  function handleQuantityChange(delta) {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > 99) return 99;
      return next;
    });
  }

  async function handleFetchNutrition() {
    try {
      setLoadingNutrition(true);
      setNutritionError("");
      await importNutritionFromOFF(id);
      const n = await fetchNutritionByProductId(id);
      setNutrition(n);
    } catch (err) {
      console.error("Error importando nutrición:", err);
      setNutritionError(err.message || "Error al importar nutrición.");
    } finally {
      setLoadingNutrition(false);
    }
  }

  // ============================
  // IA – Sustitutos
  // ============================
  async function handleFetchAiSubstitutes() {
    try {
      setAiSubsLoading(true);
      setAiSubsError("");

      const resp = await fetchAiSubstitutes(id, lang);

      if (!resp.ok) {
        setAiSubs([]);
        setAiSubsError(
          resp.error || "No se pudo obtener sustitutos con IA."
        );
        return;
      }

      setAiSubs(resp.ai?.substitutes || []);
    } catch (err) {
      console.error("handleFetchAiSubstitutes error:", err);
      setAiSubs([]);
      setAiSubsError("Error inesperado al consultar IA.");
    } finally {
      setAiSubsLoading(false);
    }
  }

  // ============================
  // IA – Consejo nutricional
  // ============================
  async function handleFetchAiAdvice() {
    // Validamos que haya nutrición antes de llamar a la IA
    if (!product || !nutrition) {
      const msg =
        lang === "es"
          ? "Primero necesitas información nutricional (usa el botón OFF)."
          : lang === "en"
          ? "You need nutritional information first (use the OFF button)."
          : "Você precisa primeiro das informações nutricionais (use o botão OFF).";

      setAiAdvice("");
      setAiAdviceError(msg);
      return;
    }

    try {
      setAiAdviceLoading(true);
      setAiAdviceError("");

      const resp = await fetchAiNutritionAdvice({
        product,
        nutrition,
        lang,
      });

      if (!resp.ok || !resp.advice) {
        const msg =
          resp.error ||
          (lang === "es"
            ? "No se pudo obtener la recomendación nutricional IA."
            : lang === "en"
            ? "Could not get AI nutrition advice."
            : "Não foi possível obter a recomendação nutricional da IA.");

        setAiAdvice("");
        setAiAdviceError(msg);
        return;
      }

      const { summary, risk_label, health_score, advice } = resp.advice;

      // Construimos un texto legible según idioma
      let text = summary || "";

      if (risk_label) {
        const labelTitle =
          lang === "es"
            ? "Riesgo principal:"
            : lang === "en"
            ? "Main risk:"
            : "Risco principal:";
        text += `\n\n${labelTitle} ${risk_label}`;
      }

      if (health_score != null) {
        const scoreTitle =
          lang === "es"
            ? "Puntaje saludable:"
            : lang === "en"
            ? "Health score:"
            : "Pontuação de saúde:";
        text += `\n${scoreTitle} ${health_score}/5`;
      }

      if (Array.isArray(advice) && advice.length > 0) {
        const recosTitle =
          lang === "es"
            ? "Recomendaciones:"
            : lang === "en"
            ? "Recommendations:"
            : "Recomendações:";
        text += `\n\n${recosTitle}\n`;
        advice.forEach((a, idx) => {
          const title = a.title || `${idx + 1}.`;
          const body = a.text || "";
          text += `\n• ${title}: ${body}`;
        });
      }

      setAiAdvice(text.trim());
    } catch (err) {
      console.error("handleFetchAiAdvice error:", err);
      const msg =
        lang === "es"
          ? "Error inesperado al consultar IA."
          : lang === "en"
          ? "Unexpected error calling AI."
          : "Erro inesperado ao chamar a IA.";
      setAiAdvice("");
      setAiAdviceError(msg);
    } finally {
      setAiAdviceLoading(false);
    }
  }

  function renderNutritionRows() {
    if (!nutrition) return null;

    const rows = [
      { label: "Calorías", value: nutrition.calories_kcal_100g ?? "-" },
      { label: "Proteínas", value: nutrition.protein_g_100g ?? "-" },
      { label: "Grasas", value: nutrition.fat_g_100g ?? "-" },
      { label: "Carbohidratos", value: nutrition.carbs_g_100g ?? "-" },
      { label: "Azúcares", value: nutrition.sugar_g_100g ?? "-" },
      { label: "Fibra", value: nutrition.fiber_g_100g ?? "-" },
      { label: "Sal", value: nutrition.salt_g_100g ?? "-" },
      { label: "NutriScore", value: nutrition.nutriscore_grade ?? "-" },
      { label: "NOVA", value: nutrition.nova_group ?? "-" },
    ];

    return rows.map((row) => (
      <div
        key={row.label}
        className="flex items-center justify-between py-1 border-b border-slate-800 last:border-b-0"
      >
        <span className="text-xs text-slate-400">{row.label}</span>
        <span className="text-xs text-slate-100 font-medium">
          {row.value}
        </span>
      </div>
    ));
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-32 grid grid-cols-1 md:grid-cols-3 gap-10">
      {/* Imagen */}
      <div className="md:col-span-1">
        <img
          src={product.image_url}
          alt={product.name}
          className="rounded-xl shadow-lg w-full bg-slate-900 object-contain max-h-[420px] p-4"
        />
      </div>

      {/* Columna central */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-white">{product.name}</h1>

        {/* Cantidad + botón agregar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 text-sm">Cantidad</span>
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
              >
                –
              </button>
              <span className="w-7 text-center text-sm text-slate-100">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                className="w-6 h-6 flex items-center justify-center rounded bg-emerald-500 text-slate-900 text-sm hover:bg-emerald-600"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-6 py-2 rounded-lg"
          >
            {selectedStore
              ? `Agregar desde ${selectedStore.store_name}`
              : "Agregar al carrito"}
          </button>
        </div>

        {/* Nutrición + IA */}
        <div className="mt-4 bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">
              Información nutricional (por 100 g/ml)
            </h2>

            <button
              type="button"
              onClick={handleFetchNutrition}
              className="text-xs px-3 py-1 rounded-lg border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loadingNutrition}
            >
              {loadingNutrition ? "Actualizando..." : "Obtener desde OFF"}
            </button>
          </div>

          {nutritionError && (
            <p className="text-xs text-red-400 mb-1">{nutritionError}</p>
          )}

          {nutrition && (
            <div className="mt-1 text-xs">{renderNutritionRows()}</div>
          )}

          {/* IA – Botones */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleFetchAiSubstitutes}
              disabled={aiSubsLoading}
              className="text-xs px-3 py-1 rounded-lg border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {aiSubsLoading
                ? "Buscando sustitutos IA..."
                : "Ver sustitutos con IA"}
            </button>

            <button
              type="button"
              onClick={handleFetchAiAdvice}
              disabled={aiAdviceLoading}
              className="text-xs px-3 py-1 rounded-lg border border-sky-500 text-sky-400 hover:bg-sky-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {aiAdviceLoading
                ? "Obteniendo recomendación IA..."
                : "Recomendación nutricional IA"}
            </button>
          </div>

          {(aiSubsError || aiAdviceError) && (
            <p className="mt-1 text-[11px] text-red-400">
              {aiSubsError || aiAdviceError}
            </p>
          )}

          {aiAdvice && (
            <div className="mt-2 rounded-lg bg-slate-950/60 border border-slate-700 px-3 py-2">
              <p className="text-[11px] text-slate-300 whitespace-pre-line">
                {aiAdvice}
              </p>
            </div>
          )}

          {/* IA – sustitutos */}
          {aiSubs.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] text-slate-400 mb-1">
                Sugerencias de sustitutos:
              </p>

              <div className="space-y-2">
                {aiSubs.map((s, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-slate-950/60 border border-slate-800 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-emerald-400">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-slate-300">
                      {s.description}
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Motivo saludable:
                      <span className="text-slate-300"> {s.health_reason}</span>
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Precio:
                      <span className="text-slate-300"> {s.price_hint}</span>
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Disponibilidad:
                      <span className="text-slate-300">
                        {" "}
                        {s.availability_hint}
                      </span>
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Categoría:
                      <span className="text-slate-300"> {s.category}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha: precios */}
      <div className="md:col-span-1 bg-slate-900 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-xl font-semibold mb-3 text-white">
          Precios por supermercado
        </h2>

        {prices.length === 0 && (
          <p className="text-slate-500">Sin precios disponibles todavía.</p>
        )}

        {prices.map((store) => {
          const isSelected = store.store_id === selectedStoreId;

          return (
            <button
              key={store.store_id}
              type="button"
              onClick={() => setSelectedStoreId(store.store_id)}
              className={`w-full flex items-center justify-between rounded-lg px-4 py-3 shadow-sm mb-2 ${
                isSelected
                  ? "bg-emerald-500/10 border border-emerald-500"
                  : "bg-slate-800 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={store.store_logo}
                  alt={store.store_name}
                  className="w-10 h-10 rounded-lg object-contain bg-white p-1"
                />

                <div>
                  <span className="text-slate-200 font-medium">
                    {store.store_name}
                  </span>

                  {store.normalized_price && (
                    <span className="text-xs text-slate-400 block">
                      ${store.normalized_price.toLocaleString("es-CL")} / 100{" "}
                      {String(product.size_unit || "")
                        .toLowerCase()
                        .includes("g")
                        ? "g"
                        : "ml"}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-emerald-400 font-bold text-lg">
                  ${store.price.toLocaleString("es-CL")}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
