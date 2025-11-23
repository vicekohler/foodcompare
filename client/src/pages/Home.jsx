// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchProducts } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { useI18n } from "../i18n/I18nContext";

export default function Home() {
  const location = useLocation();
  const { t, tFmt } = useI18n();

  const [allProducts, setAllProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Leer ?q= de la URL
  const searchTerm = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("q") || "").trim().toLowerCase();
  }, [location.search]);

  // Cargar productos una sola vez
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchProducts();
        if (!cancelled) {
          setAllProducts(data || []);
        }
      } catch (e) {
        console.error("Error en Home al cargar productos:", e);
        if (!cancelled) {
          setError(t("home.errorLoading"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Categorías únicas desde los productos
  const categories = useMemo(() => {
    const set = new Set();
    allProducts.forEach((p) => {
      if (p.category) {
        set.add(p.category);
      }
    });
    return Array.from(set).sort();
  }, [allProducts]);

  // Aplicar filtros (search + categoría)
  useEffect(() => {
    let data = allProducts;

    if (searchTerm) {
      data = data.filter((p) =>
        String(p.name || "")
          .toLowerCase()
          .includes(searchTerm)
      );
    }

    if (selectedCategory !== "all") {
      data = data.filter(
        (p) =>
          String(p.category || "").toLowerCase() ===
          selectedCategory.toLowerCase()
      );
    }

    setFiltered(data);
  }, [allProducts, searchTerm, selectedCategory]);

  // Título dinámico con i18n
  const title =
    searchTerm && selectedCategory !== "all"
      ? tFmt("home.title.searchInCategory", {
          term: searchTerm,
          category: selectedCategory
        })
      : searchTerm
      ? tFmt("home.title.search", { term: searchTerm })
      : selectedCategory !== "all"
      ? tFmt("home.title.category", { category: selectedCategory })
      : t("home.title.base");

  return (
    <div className="max-w-7xl mx-auto pt-24 px-4">
      <h1 className="text-2xl font-bold mb-3 text-white">{title}</h1>

      {/* Filtros por categoría */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              selectedCategory === "all"
                ? "bg-emerald-500 text-slate-950 border-emerald-500"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:border-emerald-400"
            }`}
          >
            {t("home.categoryAll")}
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                selectedCategory === cat
                  ? "bg-emerald-500 text-slate-950 border-emerald-500"
                  : "bg-slate-900 text-slate-200 border-slate-700 hover:border-emerald-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-slate-400 text-sm">{t("home.loading")}</p>
      )}

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-slate-400">{t("home.noResults")}</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
