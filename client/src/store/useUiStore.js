// src/store/useUIStore.js
import { create } from "zustand";

const useUIStore = create((set) => ({
  isCartOpen: false,
  isChatOpen: false,

  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),

  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),
}));

export default useUIStore;
