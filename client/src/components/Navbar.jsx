// client/src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import useCartStore from "../store/useCartStore";
import useUIStore from "../store/useUIStore";
import useAuthStore from "../store/useAuthStore";
import { useI18n } from "../i18n/I18nContext";

export default function Navbar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const items = useCartStore((s) => s.items);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const openCart = useUIStore((s) => s.openCart);
  const openChat = useUIStore((s) => s.openChat);

  const { lang, setLang, t } = useI18n();

  const totalItems = items.reduce((sum, it) => sum + (it.qty || 0), 0);

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (search.trim()) {
      // futuro: navegar a /?q=...
      console.log("Buscar:", search);
    }
  }

  function handleLoginClick() {
    navigate("/login");
  }

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  }

  function handleGoProfile() {
    setUserMenuOpen(false);
    navigate("/profile");
  }

  const displayName = user
    ? `${user.name || ""} ${user.last_name || ""}`.trim() || user.email
    : "";

  const initialsSource = user
    ? `${user.name || ""} ${user.last_name || ""}`.trim() ||
      user.email ||
      "?"
    : "?";

  const initials = initialsSource
    .trim()
    .split(" ")
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

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
            placeholder={t("navbar.searchPlaceholder")}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
        </form>

        {/* Selector de idioma */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
          {["es", "en", "pt"].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={`px-1.5 py-0.5 rounded ${
                lang === code ? "bg-slate-800 text-emerald-400" : "hover:text-emerald-300"
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Asistente IA */}
        <button
          type="button"
          onClick={openChat}
          className="hidden sm:inline-flex items-center gap-1 text-sm text-slate-200 hover:text-emerald-400"
        >
          <span>{t("navbar.assistant")}</span>
        </button>

        {/* Login / Usuario */}
        {!user && (
          <button
            type="button"
            onClick={handleLoginClick}
            className="text-sm text-slate-200 hover:text-emerald-400"
          >
            {t("navbar.login")}
          </button>
        )}

        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-slate-200 hover:text-emerald-400"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-slate-900">
                    {initials}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline max-w-[140px] truncate">
                {displayName}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-lg py-1 text-sm">
                <button
                  type="button"
                  onClick={handleGoProfile}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-100"
                >
                  {t("navbar.profile")}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-red-300"
                >
                  {t("navbar.logout")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Carrito */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex items-center gap-1 text-sm text-slate-200 hover:text-emerald-400"
        >
          <span>{t("navbar.cart")}</span>
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
