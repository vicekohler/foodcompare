// src/pages/Home.jsx
import { useEffect, useState } from "react";
import { fetchProducts } from "../lib/api";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchProducts();
        if (!cancelled) {
          setProducts(data);
          // Si quieres loguear una sola vez:
          // console.log("Productos cargados en Home:", data);
        }
      } catch (e) {
        console.error("Error en Home al cargar productos:", e);
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

  return (
    <div className="max-w-7xl mx-auto pt-24 px-4">
      <h1 className="text-2xl font-bold mb-4">
        Lo mejor de la semana (dataset demo)
      </h1>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {!error && products.length === 0 && (
        <p className="text-slate-400">
          No hay productos en el dataset. ¿La respuesta de /api/products viene vacía?
        </p>
      )}

      {products.length > 0 && (
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
