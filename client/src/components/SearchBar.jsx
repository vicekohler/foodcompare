// client/src/components/SearchBar.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { searchProducts } from "../lib/api";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      const data = await searchProducts(query);
      setResults(data);
      setOpen(true);
    }, 250); // pequeño debounce

    return () => clearTimeout(t);
  }, [query]);

  function handleBlur() {
    // pequeño delay para permitir click en opción
    setTimeout(() => setOpen(false), 150);
  }

  return (
    <div className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query && setOpen(true)}
        onBlur={handleBlur}
        placeholder="Buscar productos o EAN…"
        className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
      />

      {open && results.length > 0 && (
        <div className="absolute mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-40 max-h-80 overflow-y-auto">
          {results.map((p) => (
            <Link
              key={p.id}
              to={`/product/${p.id}`}
              className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 cursor-pointer"
            >
              <img
                src={p.image_url}
                alt={p.name}
                className="w-10 h-10 rounded bg-white object-contain"
              />
              <div className="flex flex-col">
                <span className="text-slate-100 text-sm font-medium">
                  {p.name}
                </span>
                <span className="text-slate-400 text-xs">
                  {p.brand || p.category || ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
