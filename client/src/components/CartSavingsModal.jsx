// src/components/CartSavingsModal.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchCartQuote } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

export default function CartSavingsModal({
  open,
  onClose,
  items,
  currentTotal,
}) {
  const { t, tFmt } = useI18n();

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
    const diff = bestStore.total - currentTotal; // >0 → tu combinación actual es más barata
    if (diff > 0) {
      savingsAmount = diff;
      savingsText = tFmt("cartSavings.currentCheaper", {
        store: bestStore.store_name,
      });
    } else if (diff < 0) {
      savingsAmount = Math.abs(diff);
      savingsText = tFmt("cartSavings.storeCheaper", {
        store: bestStore.store_name,
      });
    } else {
      savingsAmount = 0;
      savingsText = tFmt("cartSavings.samePrice", {
        store: bestStore.store_name,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">
            {t("cartSavings.title")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            {t("cartSavings.close")}
          </button>
        </div>

        {!hasItems && (
          <p className="text-sm text-slate-400">
            {t("cartSavings.emptyCart")}
          </p>
        )}

        {hasItems && loading && (
          <p className="text-sm text-slate-400">
            {t("cartSavings.loading")}
          </p>
        )}

        {hasItems && !loading && quote && (
          <>
            {/* Resumen ahorro */}
            {bestStore && (
              <div className="mb-4 rounded-xl bg-slate-900 border border-emerald-500/50 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-emerald-400">
                    {t("cartSavings.totalSavedLabel")}
                  </span>
                  <span className="text-sm font-semibold text-slate-100">
                    ${savingsAmount?.toLocaleString("es-CL") ?? "0"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{savingsText}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {tFmt("cartSavings.currentCart", {
                    total: currentTotal.toLocaleString("es-CL"),
                  })}
                  <br />
                  {tFmt("cartSavings.allInStore", {
                    store: bestStore.store_name,
                    total: bestStore.total.toLocaleString("es-CL"),
                  })}
                </p>
              </div>
            )}

            {/* Tabla por supermercado */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 text-xs text-slate-400 flex justify-between">
                <span>{t("cartSavings.table.store")}</span>
                <span>{t("cartSavings.table.total")}</span>
              </div>
              <div className="divide-y divide-slate-800">
                {quote.by_store?.map((s) => {
                  const isBest =
                    bestStore && s.store_id === bestStore.store_id;
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
            {t("cartSavings.error")}
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
