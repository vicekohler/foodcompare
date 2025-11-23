// client/src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import useCartStore from "../store/useCartStore";
import useUIStore from "../store/useUIStore";
import useAuthStore from "../store/useAuthStore";
import { useI18n } from "../i18n/I18nContext";
import { searchProducts } from "../lib/api";

// URLs de banderas
const FLAG_URLS = {
  es: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Bandera_de_Espa%C3%B1a.svg/1125px-Bandera_de_Espa%C3%B1a.svg.png",
  en: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Flag_of_the_United_Kingdom_(1-2).svg/500px-Flag_of_the_United_Kingdom_(1-2).svg.png",
  pt: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Flag_of_Brazil.svg/330px-Flag_of_Brazil.svg.png",
};

// Traducción de nombres según idioma actual
function getLangLabel(code, uiLang) {
  const labels = {
    es: { es: "Español", en: "Inglés", pt: "Portugués" },
    en: { es: "Spanish", en: "English", pt: "Portuguese" },
    pt: { es: "Espanhol", en: "Inglês", pt: "Português" },
  };
  return labels[uiLang]?.[code] || code.toUpperCase();
}

export default function Navbar() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Autocompletado
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const items = useCartStore((s) => s.items);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const openCart = useUIStore((s) => s.openCart);
  const openChat = useUIStore((s) => s.openChat);

  const { lang, setLang, t } = useI18n();

  const totalItems = items.reduce((sum, it) => sum + (it.qty || 0), 0);

  /* =========================
   *  SEARCH + AUTOCOMPLETE
   * ========================= */
  function handleSearchSubmit(e) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;

    navigate(`/?q=${encodeURIComponent(q)}`);
    setShowSuggestions(false);
  }

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchProducts(q);
        setSuggestions(results.slice(0, 8));
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  function handleSelectSuggestion(product) {
    navigate(`/product/${product.id}`);
    setSearch("");
    setShowSuggestions(false);
    setSuggestions([]);
  }

  /* =========================
   *  AUTH MENU
   * ========================= */
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
    ? `${user.name || ""} ${user.last_name || ""}`.trim() || user.email
    : "?";

  const initials = initialsSource
    .split(" ")
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  /* =========================
   *  RENDER
   * ========================= */
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="max-w-7xl mx-auto flex items-center gap-4 px-4 py-3">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-emerald-400 font-semibold">
          <span className="text-lg">FoodCompare CL</span>
        </Link>

        {/* BUSCADOR */}
        <div className="flex-1 max-w-xl relative">
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={t("navbar.searchPlaceholder")}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
            />
          </form>

          {showSuggestions && (suggestions.length > 0 || searchLoading) && (
            <div className="absolute z-50 mt-1 w-full rounded-lg bg-slate-900 border border-slate-700 shadow-lg max-h-80 overflow-y-auto">

              {searchLoading && (
                <div className="px-3 py-2 text-xs text-slate-400">
                  {lang === "en" ? "Searching..." : lang === "pt" ? "Buscando..." : "Buscando..."}
                </div>
              )}

              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(p);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-800 text-xs"
                >
                  {p.image_url && (
                    <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded bg-slate-800 object-contain" />
                  )}
                  <div>
                    <span className="text-slate-100 font-medium">{p.name}</span>
                    <span className="text-[11px] text-slate-400">{p.brand}</span>
                  </div>
                </button>
              ))}

              {!searchLoading && suggestions.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">
                  {lang === "en" ? "No results" : lang === "pt" ? "Sem resultados" : "Sin resultados"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==== SELECTOR DE IDIOMA (BANDERAS) ==== */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setLangMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-300"
          >
            <img src={FLAG_URLS[lang]} className="w-5 h-3 rounded-sm object-cover" />
            <span>{getLangLabel(lang, lang)}</span>
          </button>

          {langMenuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-lg py-1 text-xs z-50">
              {["es", "en", "pt"].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setLang(code);
                    setLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800 ${
                    code === lang ? "text-emerald-400" : "text-slate-200"
                  }`}
                >
                  <img src={FLAG_URLS[code]} className="w-5 h-3 rounded-sm object-cover" />
                  <span>{getLangLabel(code, lang)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Asistente IA */}
        <button
          type="button"
          onClick={openChat}
          className="hidden sm:inline-flex items-center gap-1 text-sm text-slate-200 hover:text-emerald-400"
        >
          <span>{t("navbar.assistant")}</span>
        </button>

        {/* LOGIN / USER */}
        {!user ? (
          <button
            type="button"
            onClick={handleLoginClick}
            className="text-sm text-slate-200 hover:text-emerald-400"
          >
            {t("navbar.login")}
          </button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-slate-200 hover:text-emerald-400"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-900">{initials}</span>
                )}
              </div>
              <span className="hidden sm:inline max-w-[140px] truncate">{displayName}</span>
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

        {/* CARRITO */}
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
