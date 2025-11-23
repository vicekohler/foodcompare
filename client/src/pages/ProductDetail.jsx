// src/pages/ProductDetail.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  fetchProductById,
  fetchPricesByProductId,
  fetchNutritionByProductId,
  importNutritionFromOFF,
} from "../lib/api";
import useCartStore from "../store/useCartStore";
import useUIStore from "../store/useUIStore"; // 👈 NUEVO

export default function ProductDetail() {
  const { id } = useParams();
  const addToCart = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast); // 👈 NUEVO

  const [product, setProduct] = useState(null);
  const [prices, setPrices] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [nutrition, setNutrition] = useState(null);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [nutritionError, setNutritionError] = useState("");

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

    // 👇 Toast de confirmación
    showToast("Producto agregado al carrito ✅");
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

  function renderNutritionRows() {
    if (!nutrition) return null;

    const rows = [
      {
        label: "Calorías",
        value:
          nutrition.calories_kcal_100g != null
            ? `${nutrition.calories_kcal_100g} kcal`
            : "-",
      },
      {
        label: "Proteínas",
        value:
          nutrition.protein_g_100g != null
            ? `${nutrition.protein_g_100g} g`
            : "-",
      },
      {
        label: "Grasas",
        value:
          nutrition.fat_g_100g != null ? `${nutrition.fat_g_100g} g` : "-",
      },
      {
        label: "Carbohidratos",
        value:
          nutrition.carbs_g_100g != null
            ? `${nutrition.carbs_g_100g} g`
            : "-",
      },
      {
        label: "Azúcares",
        value:
          nutrition.sugar_g_100g != null
            ? `${nutrition.sugar_g_100g} g`
            : "-",
      },
      {
        label: "Fibra",
        value:
          nutrition.fiber_g_100g != null
            ? `${nutrition.fiber_g_100g} g`
            : "-",
      },
      {
        label: "Sal",
        value:
          nutrition.salt_g_100g != null ? `${nutrition.salt_g_100g} g` : "-",
      },
      {
        label: "NutriScore",
        value: nutrition.nutriscore_grade || "-",
      },
      {
        label: "NOVA",
        value: nutrition.nova_group != null ? nutrition.nova_group : "-",
      },
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
      {/* Imagen izquierda */}
      <div className="md:col-span-1">
        <img
          src={product.image_url}
          alt={product.name}
          className="rounded-xl shadow-lg w-full bg-slate-900 object-contain max-h-[420px] p-4"
        />
      </div>

      {/* Columna central: título + botón + cantidad + tabla nutricional */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-white">{product.name}</h1>

        {/* Selector de cantidad + botón */}
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

        <p className="text-slate-400 text-sm">
          Tamaño: {product.size_value} {product.size_unit}
        </p>

        {/* Card de información nutricional */}
        <div className="mt-4 bg-slate-900 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
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
            <p className="text-xs text-red-400 mb-2">{nutritionError}</p>
          )}

          {loadingNutrition && !nutrition && (
            <p className="text-xs text-slate-400">
              Cargando información nutricional...
            </p>
          )}

          {!loadingNutrition && !nutrition && !nutritionError && (
            <p className="text-xs text-slate-400">
              Aún no tenemos información nutricional para este producto.
              Puedes obtenerla desde OpenFoodFacts.
            </p>
          )}

          {nutrition && (
            <div className="mt-2 text-xs">
              {renderNutritionRows()}

              {nutrition.allergens && (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-400 mb-1">
                    Alérgenos:
                  </p>
                  <p className="text-[11px] text-slate-100">
                    {nutrition.allergens}
                  </p>
                </div>
              )}

              {nutrition.ingredients && (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-400 mb-1">
                    Ingredientes:
                  </p>
                  <p className="text-[11px] text-slate-100 line-clamp-3">
                    {nutrition.ingredients}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha: precios por supermercado */}
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
                <div className="flex flex-col items-start">
                  <span className="text-slate-200 font-medium">
                    {store.store_name}
                  </span>
                  {store.normalized_price && (
                    <span className="text-xs text-slate-400">
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
