// src/components/CartSavingsModal.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchCartQuote } from "../lib/api";

export default function CartSavingsModal({ open, onClose, items, currentTotal }) {
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null); // { by_store, best_store }
  const hasItems = items && items.length > 0;

  useEffect(() => {
    if (!open || !hasItems) {
      setQuote(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await fetchCartQuote(items);
      if (!cancelled) {
        setQuote(data);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [open, hasItems, items]);

  if (!open) return null;

  const bestStore = quote?.best_store || null;

  let savingsText = "";
  let savingsAmount = null;

  if (bestStore) {
    const diff = bestStore.total - currentTotal; // >0 => tu combinación es más barata
    if (diff > 0) {
      savingsAmount = diff;
      savingsText = `Con tu combinación actual ahorras frente a comprar todo en ${bestStore.store_name}.`;
    } else if (diff < 0) {
      savingsAmount = Math.abs(diff);
      savingsText = `Si compras todo en ${bestStore.store_name} podrías ahorrar frente a tu combinación actual.`;
    } else {
      savingsAmount = 0;
      savingsText = `Tu compra cuesta lo mismo que comprar todo en ${bestStore.store_name}.`;
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">
            Comparación por supermercado
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Cerrar
          </button>
        </div>

        {!hasItems && (
          <p className="text-sm text-slate-400">
            Agrega productos al carrito para ver el ahorro potencial.
          </p>
        )}

        {hasItems && loading && (
          <p className="text-sm text-slate-400">
            Calculando precios en los supermercados...
          </p>
        )}

        {hasItems && !loading && quote && (
          <>
            {/* Resumen ahorro */}
            {bestStore && (
              <div className="mb-4 rounded-xl bg-slate-900 border border-emerald-500/50 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-emerald-400">
                    Total ahorrado estimado
                  </span>
                  <span className="text-sm font-semibold text-slate-100">
                    ${savingsAmount?.toLocaleString("es-CL") ?? "0"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{savingsText}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Tu carrito actual:{" "}
                  <span className="font-semibold">
                    ${currentTotal.toLocaleString("es-CL")}
                  </span>
                  .<br />
                  Comprar TODO en{" "}
                  <span className="font-semibold">{bestStore.store_name}</span>{" "}
                  costaría{" "}
                  <span className="font-semibold">
                    ${bestStore.total.toLocaleString("es-CL")}
                  </span>
                  .
                </p>
              </div>
            )}

            {/* Tabla por supermercado */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 text-xs text-slate-400 flex justify-between">
                <span>Supermercado</span>
                <span>Total carrito</span>
              </div>
              <div className="divide-y divide-slate-800">
                {quote.by_store?.map((s) => {
                  const isBest = bestStore && s.store_id === bestStore.store_id;
                  return (
                    <div
                      key={s.store_id}
                      className={`px-3 py-2 text-sm flex items-center justify-between ${
                        isBest ? "bg-emerald-500/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {s.store_logo && (
                          <img
                            src={s.store_logo}
                            alt={s.store_name}
                            className="w-6 h-6 rounded bg-white object-contain"
                          />
                        )}
                        <span className="text-slate-100">{s.store_name}</span>
                      </div>
                      <span className="text-slate-100">
                        ${s.total.toLocaleString("es-CL")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {hasItems && !loading && !quote && (
          <p className="text-sm text-red-400 mt-2">
            No se pudo calcular la comparación de supermercados.
          </p>
        )}
      </div>
    </div>
  );
}

CartSavingsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      product_id: PropTypes.number,
      id: PropTypes.number,
      store_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      qty: PropTypes.number,
      unit_price: PropTypes.number,
      name: PropTypes.string,
      image_url: PropTypes.string,
      store_name: PropTypes.string,
      store_logo: PropTypes.string,
    })
  ).isRequired,
  currentTotal: PropTypes.number.isRequired,
};
