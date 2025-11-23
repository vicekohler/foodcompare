// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { fetchProducts, fetchCategories } from "../lib/api";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [prods, cats] = await Promise.all([
          fetchProducts(),
          fetchCategories(),
        ]);

        if (cancelled) return;

        setProducts(prods || []);
        setCategories(cats || []);
      } catch (e) {
        console.error("Error en Home al cargar productos/categorías:", e);
        if (!cancelled) {
          setError(
            "No se pudieron cargar los productos. Revisa que el servidor esté arriba."
          );
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts =
    selectedCat === "all"
      ? products
      : products.filter((p) => p.category === selectedCat);

  return (
    <div className="max-w-7xl mx-auto pt-24 px-4 pb-12">
      {/* Título + Filtros */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">
          Lo mejor de la semana{" "}
          <span className="text-slate-400">(dataset demo)</span>
        </h1>

        {/* Filtro por categoría */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Filtrar por categoría:</span>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-sm text-slate-100 rounded-lg px-3 py-1.5"
            >
              <option value="all">Todas</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!error && filteredProducts.length === 0 && (
        <p className="text-slate-400">
          No hay productos para esta categoría o la respuesta de /api/products viene vacía.
        </p>
      )}

      {filteredProducts.length > 0 && (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
