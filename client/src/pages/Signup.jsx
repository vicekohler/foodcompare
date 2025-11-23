// client/src/pages/Signup.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupRequest } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

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

// devolvemos una key para i18n + la clase
function getPasswordStrength(password) {
  const { hasMinLength, hasLower, hasUpper, hasNumber, hasSpecial } =
    isStrongPassword(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasLower) score++;
  if (hasUpper) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  if (password.length === 0) {
    return { key: "none", className: "text-slate-500" };
  }

  if (score <= 2) {
    return { key: "weak", className: "text-red-400" };
  } else if (score === 3 || score === 4) {
    return { key: "medium", className: "text-yellow-400" };
  } else {
    return { key: "strong", className: "text-emerald-400" };
  }
}

export default function Signup() {
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const strength = getPasswordStrength(password);
  const pwChecks = isStrongPassword(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name || !lastName || !email || !password || !password2) {
      setError(t("signup.errors.requiredFields"));
      return;
    }

    if (password !== password2) {
      setError(t("signup.errors.passwordsNoMatch"));
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
      setError(t("signup.errors.passwordPolicy"));
      return;
    }

    setLoading(true);

    const { ok, status, data, error: apiError } = await signupRequest({
      name,
      lastName,
      email,
      password,
      phone,
      avatarUrl: null,
    });

    setLoading(false);

    if (!ok) {
      const msg =
        apiError ||
        data?.error ||
        data?.message ||
        (status === 409
          ? t("signup.errors.emailExists")
          : t("signup.errors.default"));
      console.error("Signup error:", status, data);
      setError(msg);
      return;
    }

    navigate("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 pt-20">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold mb-6">{t("signup.title")}</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">
                {t("signup.nameLabel")}
              </label>
              <input
                type="text"
                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                {t("signup.lastNameLabel")}
              </label>
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
            <label className="block text-sm mb-1">
              {t("signup.phoneLabel")}
            </label>
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
            <label className="block text-sm mb-1">
              {t("signup.emailLabel")}
            </label>
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
            <label className="block text-sm mb-1">
              {t("signup.passwordLabel")}
            </label>
            <input
              type="password"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="mt-1 text-xs flex items-center justify-between">
              <span className={strength.className}>
                {t("signup.passwordStrength.prefix")}{" "}
                {t(`signup.passwordStrength.${strength.key}`)}
              </span>
            </div>
            <ul className="mt-1 text-[11px] text-slate-400 space-y-0.5">
              <li>
                {pwChecks.hasMinLength ? "✅" : "⚪"}{" "}
                {t("signup.passwordChecklist.minLength")}
              </li>
              <li>
                {pwChecks.hasLower ? "✅" : "⚪"}{" "}
                {t("signup.passwordChecklist.lower")}
              </li>
              <li>
                {pwChecks.hasUpper ? "✅" : "⚪"}{" "}
                {t("signup.passwordChecklist.upper")}
              </li>
              <li>
                {pwChecks.hasNumber ? "✅" : "⚪"}{" "}
                {t("signup.passwordChecklist.number")}
              </li>
              <li>
                {pwChecks.hasSpecial ? "✅" : "⚪"}{" "}
                {t("signup.passwordChecklist.special")}
              </li>
            </ul>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm mb-1">
              {t("signup.password2Label")}
            </label>
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
            {loading ? t("signup.buttonLoading") : t("signup.buttonSubmit")}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">
          {t("signup.alreadyAccount")}{" "}
          <Link
            to="/login"
            className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
          >
            {t("signup.loginLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
