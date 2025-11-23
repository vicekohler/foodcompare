// client/src/store/useUIStore.js
import { create } from "zustand";

const useUIStore = create((set) => ({
  // Drawer carrito
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),

  // Chat / asistente
  isChatOpen: false,
  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),

  // Toast global
  toast: null, // { message, type, id }
  showToast: (message, type = "success") =>
    set({
      toast: {
        id: Date.now(),
        message,
        type,
      },
    }),
  hideToast: () => set({ toast: null }),
}));

export default useUIStore;
