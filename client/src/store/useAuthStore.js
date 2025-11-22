// client/src/store/useAuthStore.js
import { create } from "zustand";

const STORAGE_KEY = "fc_auth";
const TOKEN_KEY = "fc_token";

const useAuthStore = create((set) => ({
  user: null,
  token: null,

  // Cargar sesión desde localStorage (lo llama App.jsx)
  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.token) return;

      set({
        user: parsed.user || null,
        token: parsed.token || null,
      });

      // Para que api.js pueda usar el token si hace falta
      localStorage.setItem(TOKEN_KEY, parsed.token || "");
    } catch (e) {
      console.error("Error leyendo auth de storage:", e);
    }
  },

  // Guardar user + token cuando hacemos login
  setAuth: ({ user, token }) => {
    set({ user: user || null, token: token || null });

    if (token) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: user || null, token })
      );
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  // Cerrar sesión
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
