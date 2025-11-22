// client/src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import useCartStore from "../store/useCartStore";
import useUIStore from "../store/useUIStore";
import useAuthStore from "../store/useAuthStore";

export default function Navbar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const items = useCartStore((s) => s.items);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const openCart = useUIStore((s) => s.openCart);
  const openChat = useUIStore((s) => s.openChat);

  const totalItems = items.reduce((sum, it) => sum + (it.qty || 0), 0);

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (search.trim()) {
      console.log("Buscar:", search);
      // futuro: navegar a /?q=...
    }
  }

  function handleAuthClick() {
    if (user) {
      // Cierra sesión
      logout();
    } else {
      // Va al login
      navigate("/login");
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-emerald-400 font-semibold"
        >
          <span className="text-lg">FoodCompare CL</span>
        </Link>

        {/* Buscador */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 flex items-center max-w-xl"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
        </form>

        {/* Asistente IA */}
        <button
          type="button"
          onClick={openChat}
          className="hidden sm:inline-flex items-center gap-1 text-sm text-slate-200 hover:text-emerald-400"
        >
          <span>Asistente</span>
        </button>

        {/* Login / Usuario */}
        <button
          type="button"
          onClick={handleAuthClick}
          className="text-sm text-slate-200 hover:text-emerald-400"
        >
          {user ? `Salir (${user.name || user.email})` : "Iniciar sesión"}
        </button>

        {/* Carrito */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex items-center gap-1 text-sm text-slate-200 hover:text-emerald-400"
        >
          <span>Carrito</span>
          {totalItems > 0 && (
            <span className="ml-1 rounded-full bg-emerald-500 text-slate-900 px-1.5 text-xs font-semibold">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
