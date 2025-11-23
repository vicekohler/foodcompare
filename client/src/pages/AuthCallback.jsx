// client/src/pages/AuthCallback.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import useAuthStore from "../store/useAuthStore";
import { API_URL } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useI18n();

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error obteniendo sesión de Supabase:", error);
          if (!cancelled) navigate("/login");
          return;
        }

        const session = data?.session;
        const user = session?.user;

        if (!session || !user) {
          console.warn("No hay sesión de Supabase en callback");
          if (!cancelled) navigate("/login");
          return;
        }

        const payload = {
          provider: "google",
          supabase_user_id: user.id,
          email: user.email,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "",
          avatar_url:
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null,
        };

        const res = await fetch(`${API_URL}/auth/login-oauth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
          console.error("Error en /auth/login-oauth:", res.status, body);
          if (!cancelled) navigate("/login");
          return;
        }

        const { token, user: safeUser } = body || {};

        if (!token || !safeUser) {
          console.error("Respuesta inválida de /auth/login-oauth:", body);
          if (!cancelled) navigate("/login");
          return;
        }

        setAuth({
          user: safeUser,
          token,
        });

        if (!cancelled) navigate("/");
      } catch (err) {
        console.error("Error en AuthCallback:", err);
        if (!cancelled) navigate("/login");
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <p className="text-slate-300">{t("authCallback.processing")}</p>
    </div>
  );
}
