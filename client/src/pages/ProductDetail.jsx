// src/pages/ProductDetail.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductById, fetchPricesByProductId } from "../lib/api";
import useCartStore from "../store/useCartStore";

export default function ProductDetail() {
  const { id } = useParams();
  const addToCart = useCartStore((s) => s.addItem);

  const [product, setProduct] = useState(null);
  const [prices, setPrices] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Cargar producto + precios
  useEffect(() => {
    async function load() {
      const p = await fetchProductById(id);
      setProduct(p);

      const pr = await fetchPricesByProductId(id);
      setPrices(pr);

      if (pr && pr.length > 0) {
        setSelectedStoreId(pr[0].store_id);
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
  }

  function handleQuantityChange(delta) {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (next > 99) return 99;
      return next;
    });
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

      {/* Título + botón + cantidad */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-white">{product.name}</h1>

        {/* Selector de cantidad + botón */}
        <div className="flex items-center gap-3">
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
                      {String(product.size_unit || "").toLowerCase().includes(
                        "g"
                      )
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
