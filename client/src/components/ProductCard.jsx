// src/components/ProductCard.jsx
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { useI18n } from "../i18n/I18nContext";

export default function ProductCard({ product }) {
  const { t } = useI18n();

  return (
    <Link
      to={`/product/${product.id}`}
      className="bg-slate-900 hover:bg-slate-800 transition rounded-xl border border-slate-800 p-4 flex flex-col shadow-sm hover:shadow-md"
    >
      {/* Imagen */}
      <div
        className="overflow-hidden rounded-lg bg-slate-800"
        style={{ aspectRatio: "4 / 3" }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
            Sin imagen
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3">
        <h2 className="text-sm font-semibold text-slate-200 line-clamp-2">
          {product.name}
        </h2>
        {product.brand && (
          <p className="text-xs text-slate-400">{product.brand}</p>
        )}

        {typeof product.best_price === "number" && (
          <p className="mt-2 font-bold text-emerald-400 text-lg">
            ${product.best_price.toLocaleString("es-CL")}
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        className="mt-auto w-full py-1.5 bg-emerald-500 text-slate-900 rounded-lg text-sm font-semibold hover:bg-emerald-400"
      >
        {t("productCard.viewPrices")}
      </button>
    </Link>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string.isRequired,
    brand: PropTypes.string,
    image_url: PropTypes.string,
    best_price: PropTypes.number
  }).isRequired
};
