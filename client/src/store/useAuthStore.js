// client/src/store/useAuthStore.js
import { create } from "zustand";

const STORAGE_KEY = "fc_auth";

const useAuthStore = create((set) => ({
  user: null,
  token: null,

  // Cargar desde localStorage al inicio (lo llamamos desde App)
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

      // opcional: si quieres tener el token por separado
      localStorage.setItem("fc_token", parsed.token || "");
    } catch (e) {
      console.error("Error leyendo auth de storage:", e);
    }
  },

  // Guardar usuario+token en estado y en localStorage
  setAuth: ({ user, token }) => {
    set({ user, token });

    if (token) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: user || null, token })
      );
      localStorage.setItem("fc_token", token);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("fc_token");
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("fc_token");
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
