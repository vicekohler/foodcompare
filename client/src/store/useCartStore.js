// src/store/useCartStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

const useCartStore = create(
  persist(
    (set) => ({
      items: [],

      // Agregar producto al carrito
      addItem: (item) =>
        set((state) => {
          const productId = item.product_id ?? item.id;
          const storeId = item.store_id ?? "unknown";

          if (!productId) {
            console.warn("addItem sin product_id/id:", item);
            return state;
          }

          const idx = state.items.findIndex(
            (it) =>
              (it.product_id ?? it.id) === productId &&
              (it.store_id ?? "unknown") === storeId
          );

          const baseItem = {
            ...item,
            product_id: productId,
            store_id: storeId,
          };

          if (idx !== -1) {
            const copy = [...state.items];
            copy[idx] = {
              ...copy[idx],
              qty: (copy[idx].qty || 0) + (item.qty || 1),
            };
            return { items: copy };
          }

          return {
            items: [
              ...state.items,
              {
                ...baseItem,
                qty: item.qty || 1,
              },
            ],
          };
        }),

      // Cambiar cantidad (usado por los botones +/-)
      setQuantity: (storeId, productId, qty) =>
        set((state) => {
          const newQty = Number(qty);

          if (!newQty || newQty <= 0) {
            // Eliminar línea si llega a 0
            return {
              items: state.items.filter(
                (it) =>
                  !(
                    (it.store_id ?? "unknown") === storeId &&
                    (it.product_id ?? it.id) === productId
                  )
              ),
            };
          }

          return {
            items: state.items.map((it) =>
              (it.store_id ?? "unknown") === storeId &&
              (it.product_id ?? it.id) === productId
                ? { ...it, qty: newQty }
                : it
            ),
          };
        }),

      // Quitar línea manualmente
      removeItem: (storeId, productId) =>
        set((state) => ({
          items: state.items.filter(
            (it) =>
              !(
                (it.store_id ?? "unknown") === storeId &&
                (it.product_id ?? it.id) === productId
              )
          ),
        })),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "foodcompare-cart",
    }
  )
);

export default useCartStore;
