// client/src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupRequest } from "../lib/api";

// misma lógica que backend para fuerza de password
function isStrongPassword(password) {
  const pw = String(password || "");
  const hasMinLength = pw.length >= 8;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  return { hasMinLength, hasLower, hasUpper, hasNumber, hasSpecial };
}

function getPasswordStrengthLabel(password) {
  const { hasMinLength, hasLower, hasUpper, hasNumber, hasSpecial } =
    isStrongPassword(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasLower) score++;
  if (hasUpper) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  if (password.length === 0) {
    return { label: "Sin contraseña", className: "text-slate-500" };
  }

  if (score <= 2) {
    return { label: "Débil", className: "text-red-400" };
  } else if (score === 3 || score === 4) {
    return { label: "Media", className: "text-yellow-400" };
  } else {
    return { label: "Fuerte", className: "text-emerald-400" };
  }
}

export default function Signup() {
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const strength = getPasswordStrengthLabel(password);
  const pwChecks = isStrongPassword(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name || !lastName || !email || !password || !password2) {
      setError(
        "Nombre, apellido, email y ambas contraseñas son obligatorios"
      );
      return;
    }

    if (password !== password2) {
      setError("Las contraseñas no coinciden");
      return;
    }

    const { hasMinLength, hasLower, hasUpper, hasNumber, hasSpecial } =
      isStrongPassword(password);

    if (
      !hasMinLength ||
      !hasLower ||
      !hasUpper ||
      !hasNumber ||
      !hasSpecial
    ) {
      setError(
        "La contraseña debe tener mínimo 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial."
      );
      return;
    }

    setLoading(true);

    const { ok, status, data, error: apiError } = await signupRequest({
      name,
      lastName,
      email,
      password,
      phone,
      avatarUrl: null, // no se pide en el registro
    });

    setLoading(false);

    if (!ok) {
      const msg =
        apiError ||
        data?.error ||
        data?.message ||
        (status === 409
          ? "Ya existe una cuenta con ese email"
          : "No se pudo crear la cuenta");
      console.error("Signup error:", status, data);
      setError(msg);
      return;
    }

    navigate("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 pt-20">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-6">Crear cuenta</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input
                type="text"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Apellido</label>
              <input
                type="text"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm mb-1">Teléfono (opcional)</label>
            <input
              type="tel"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>

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
            <div className="mt-1 text-xs flex items-center justify-between">
              <span className={strength.className}>
                Seguridad: {strength.label}
              </span>
            </div>
            <ul className="mt-1 text-[11px] text-slate-400 space-y-0.5">
              <li>
                {pwChecks.hasMinLength ? "✅" : "⚪"} Mínimo 8 caracteres
              </li>
              <li>{pwChecks.hasLower ? "✅" : "⚪"} Una minúscula</li>
              <li>{pwChecks.hasUpper ? "✅" : "⚪"} Una mayúscula</li>
              <li>{pwChecks.hasNumber ? "✅" : "⚪"} Un número</li>
              <li>{pwChecks.hasSpecial ? "✅" : "⚪"} Un carácter especial</li>
            </ul>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm mb-1">Confirmar contraseña</label>
            <input
              type="password"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
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
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-2 rounded-lg transition"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          ¿Ya tienes cuenta?{" "}
          <Link
            to="/login"
            className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
