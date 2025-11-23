// client/src/store/useCartStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

// helper para agregar / acumular cantidad
function upsertItem(list, newItem) {
  const idx = list.findIndex(
    (it) =>
      (it.product_id ?? it.id) === (newItem.product_id ?? newItem.id) &&
      it.store_id === newItem.store_id
  );

  const qtyToAdd = newItem.qty ?? 1;

  if (idx === -1) {
    return [...list, { ...newItem, qty: qtyToAdd }];
  }

  const copy = [...list];
  const prev = copy[idx];
  copy[idx] = {
    ...prev,
    ...newItem,
    qty: (prev.qty || 0) + qtyToAdd,
  };
  return copy;
}

const useCartStore = create(
  persist(
    (set, get) => ({
      // usuario actual (null -> "anon")
      currentUserId: "anon",
      // mapa de carritos: { [userId]: Item[] }
      cartsByUser: {},
      // carrito visible (se deriva de cartsByUser[currentUserId])
      items: [],

      // Debes llamarlo cuando cambie el usuario logueado
      setCurrentUser(userId) {
        const uid = userId || "anon";
        const { cartsByUser } = get();
        const items = cartsByUser[uid] || [];
        set({ currentUserId: uid, items });
      },

      addItem(item) {
        set((state) => {
          const uid = state.currentUserId || "anon";
          const currentItems = state.items || [];
          const nextItems = upsertItem(currentItems, item);

          return {
            items: nextItems,
            cartsByUser: {
              ...state.cartsByUser,
              [uid]: nextItems,
            },
          };
        });
      },

      updateQty(productId, storeId, qty) {
        set((state) => {
          const uid = state.currentUserId || "anon";
          const nextItems = (state.items || [])
            .map((it) =>
              (it.product_id ?? it.id) === productId &&
              (storeId == null || it.store_id === storeId)
                ? { ...it, qty }
                : it
            )
            .filter((it) => (it.qty || 0) > 0);

          return {
            items: nextItems,
            cartsByUser: {
              ...state.cartsByUser,
              [uid]: nextItems,
            },
          };
        });
      },

      removeItem(productId, storeId) {
        set((state) => {
          const uid = state.currentUserId || "anon";
          const nextItems = (state.items || []).filter(
            (it) =>
              !(
                (it.product_id ?? it.id) === productId &&
                (storeId == null || it.store_id === storeId)
              )
          );

          return {
            items: nextItems,
            cartsByUser: {
              ...state.cartsByUser,
              [uid]: nextItems,
            },
          };
        });
      },

      clearCart() {
        set((state) => {
          const uid = state.currentUserId || "anon";
          return {
            items: [],
            cartsByUser: {
              ...state.cartsByUser,
              [uid]: [],
            },
          };
        });
      },
    }),
    {
      name: "cart-store-v2", // clave nueva en localStorage para no mezclar con la anterior
    }
  )
);

export default useCartStore;
