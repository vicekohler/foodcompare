// client/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginRequest } from "../lib/api";
import useAuthStore from "../store/useAuthStore";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const resp = await loginRequest({ email, password });

    setLoading(false);

    if (!resp.ok) {
      setError(resp.error || "No se pudo iniciar sesión");
      return;
    }

    setAuth({
      user: resp.user,
      token: resp.token,
    });

    navigate("/");
  }

  async function handleLoginWithGoogle() {
    try {
      setError("");
      setLoadingGoogle(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Error en signInWithOAuth:", error);
        setError("No se pudo iniciar sesión con Google");
        setLoadingGoogle(false);
      }
      // En el caso exitoso, el navegador se redirige y este componente deja de existir.
    } catch (err) {
      console.error("Error en handleLoginWithGoogle:", err);
      setError("Error inesperado al iniciar sesión con Google");
      setLoadingGoogle(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 pt-20">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-6">Iniciar sesión</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-600 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingGoogle}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-2 rounded-lg transition"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        {/* Separador */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-[11px] text-slate-400">o</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        {/* Botón Google */}
        <button
          type="button"
          onClick={handleLoginWithGoogle}
          disabled={loadingGoogle || loading}
          className="mt-4 w-full border border-slate-700 hover:border-emerald-500 text-slate-100 text-sm py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loadingGoogle ? "Redirigiendo a Google..." : "Continuar con Google"}
        </button>

        <p className="mt-4 text-xs text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link
            to="/signup"
            className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
