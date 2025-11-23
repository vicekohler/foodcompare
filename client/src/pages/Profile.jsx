// client/src/pages/Profile.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { fetchProfile, updateProfile, uploadAvatar } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

export default function Profile() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // 1) Si no hay sesión, mandar al login
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // 2) Prefill rápido desde el store
  useEffect(() => {
    if (!user) return;

    setName(user.name || "");
    setLastName(user.last_name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setAvatarUrl(user.avatar_url || "");
  }, [user]);

  // 3) Cargar perfil desde backend
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setSavedMsg("");

      try {
        const resp = await fetchProfile(token);
        console.log("Profile.jsx fetchProfile resp:", resp);

        if (cancelled) return;

        if (!resp || !resp.ok) {
          setError(
            resp?.error || t("profile.errors.loadProfile")
          );
          return;
        }

        const u = resp.data || {};

        setName(u.name || "");
        setLastName(u.last_name || "");
        setEmail(u.email || "");
        setPhone(u.phone || "");
        setAvatarUrl(u.avatar_url || "");

        setAuth({
          user: u,
          token,
        });
      } catch (err) {
        console.error("Error en loadProfile:", err);
        if (!cancelled) {
          setError(t("profile.errors.unexpectedLoad"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [token, setAuth, t]);

  async function handleSave(e) {
    e.preventDefault();
    if (!token) return;

    setError("");
    setSavedMsg("");
    setSaving(true);

    const payload = {
      name,
      last_name: lastName,
      phone,
      avatar_url: avatarUrl,
    };

    try {
      const resp = await updateProfile(token, payload);
      console.log("Profile.jsx updateProfile resp:", resp);

      if (!resp || !resp.ok) {
        setError(resp?.error || t("profile.errors.updateProfile"));
        return;
      }

      const updated = resp.data || {};

      setAuth({
        user: updated,
        token,
      });

      setSavedMsg(t("profile.messages.profileUpdated"));
    } catch (err) {
      console.error("Error en handleSave:", err);
      setError(t("profile.errors.unexpectedUpdate"));
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setError("");
    setSavedMsg("");
    setUploadingAvatar(true);

    try {
      const resp = await uploadAvatar(token, file);
      console.log("handleAvatarChange uploadAvatar resp:", resp);

      if (!resp.ok || !resp.url) {
        setError(resp.error || t("profile.errors.uploadAvatar"));
        return;
      }

      setAvatarUrl(resp.url);

      setAuth({
        user: {
          ...(user || {}),
          avatar_url: resp.url,
        },
        token,
      });

      setSavedMsg(t("profile.messages.avatarUpdated"));
    } catch (err) {
      console.error("Error en handleAvatarChange:", err);
      setError(t("profile.errors.unexpectedUploadAvatar"));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  if (!token) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 pt-20">
        <p className="text-slate-300">{t("profile.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pt-24 px-4">
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar preview clickable */}
          <button
            type="button"
            onClick={handleAvatarClick}
            className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 hover:border-emerald-500 transition"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-semibold">
                {name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <div>
            <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
            <p className="text-sm text-slate-400">
              {t("profile.avatarHint")}
              {uploadingAvatar ? ` (${t("profile.uploading")})` : ""}
            </p>
            <p className="text-[11px] text-slate-500">
              {t("profile.avatarNote")}
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSave}>
          {/* Nombre / Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">
                {t("profile.nameLabel")}
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
                {t("profile.lastNameLabel")}
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

          {/* Email (solo lectura) */}
          <div>
            <label className="block text-sm mb-1">
              {t("profile.emailLabel")}
            </label>
            <input
              type="email"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm outline-none text-slate-400"
              value={email}
              readOnly
            />
            <p className="mt-1 text-xs text-slate-500">
              {t("profile.emailNote")}
            </p>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm mb-1">
              {t("profile.phoneLabel")}
            </label>
            <input
              type="tel"
              className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/40 border border-red-600 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {savedMsg && (
            <div className="rounded-lg bg-emerald-900/40 border border-emerald-600 px-3 py-2 text-sm text-emerald-200">
              {savedMsg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || uploadingAvatar}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold px-6 py-2 rounded-lg transition"
            >
              {saving ? t("profile.saving") : t("profile.saveButton")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
