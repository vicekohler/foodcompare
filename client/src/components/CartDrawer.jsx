// src/components/CartDrawer.jsx
import useCartStore from "../store/useCartStore";
import useUIStore from "../store/useUIStore";

export default function CartDrawer() {
  const isOpen = useUIStore((s) => s.isCartOpen);
  const closeCart = useUIStore((s) => s.closeCart);

  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  if (!isOpen) return null;

  // Agrupar por supermercado
  const storeGroups = Object.values(
    items.reduce((acc, it) => {
      const storeId = it.store_id ?? "unknown";
      if (!acc[storeId]) {
        acc[storeId] = {
          storeId,
          storeName: it.store_name || "Supermercado",
          storeLogo: it.store_logo || "",
          items: [],
          total: 0,
        };
      }
      acc[storeId].items.push(it);
      acc[storeId].total += (it.unit_price || 0) * (it.qty || 0);
      return acc;
    }, {})
  );

  const cartTotal = storeGroups.reduce((sum, g) => sum + g.total, 0);

  function handleChangeQty(storeId, productId, newQty) {
    setQuantity(storeId, productId, newQty);
  }

  function handleRemove(storeId, productId) {
    removeItem(storeId, productId);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      {/* Panel */}
      <div className="h-full w-full max-w-sm bg-slate-950 border-l border-slate-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Carrito</h2>
          <button
            type="button"
            onClick={closeCart}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Cerrar
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {storeGroups.length === 0 && (
            <p className="text-slate-500 text-sm">
              Aún no has agregado productos.
            </p>
          )}

          {storeGroups.map((group) => (
            <div
              key={group.storeId}
              className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden"
            >
              {/* Encabezado tienda */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80">
                <div className="flex items-center gap-2">
                  {group.storeLogo && (
                    <img
                      src={group.storeLogo}
                      alt={group.storeName}
                      className="w-7 h-7 rounded-full bg-white object-contain"
                    />
                  )}
                  <span className="text-slate-100 font-medium">
                    {group.storeName}
                  </span>
                </div>
                <span className="text-emerald-400 font-semibold text-sm">
                  ${group.total.toLocaleString("es-CL")}
                </span>
              </div>

              {/* Productos de la tienda */}
              <div className="divide-y divide-slate-800">
                {group.items.map((item) => {
                  const productId = item.product_id ?? item.id;
                  const lineTotal = (item.unit_price || 0) * (item.qty || 0);

                  return (
                    <div
                      key={productId}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded bg-slate-900 object-contain"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-100 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.qty} x $
                          {item.unit_price?.toLocaleString("es-CL") ?? "0"}
                        </p>
                      </div>

                      {/* Controles cantidad */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // ✅ Si ya está en 1, no hacemos nada
                            if ((item.qty || 1) <= 1) return;

                            handleChangeQty(
                              group.storeId,
                              productId,
                              (item.qty || 1) - 1
                            );
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 text-slate-200 text-sm hover:bg-slate-700"
                        >
                          –
                        </button>

                        <span className="w-7 text-center text-sm text-slate-100">
                          {item.qty || 1}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            handleChangeQty(
                              group.storeId,
                              productId,
                              (item.qty || 1) + 1
                            )
                          }
                          className="w-7 h-7 flex items-center justify-center rounded bg-emerald-500 text-slate-900 text-sm hover:bg-emerald-600"
                        >
                          +
                        </button>
                      </div>

                      {/* Total línea + quitar */}
                      <div className="text-right ml-2">
                        <div className="text-sm text-emerald-400 font-semibold">
                          ${lineTotal.toLocaleString("es-CL")}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemove(group.storeId, productId)
                          }
                          className="text-[11px] text-slate-500 hover:text-red-400"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total</span>
            <span className="text-emerald-400 font-semibold">
              ${cartTotal.toLocaleString("es-CL")}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearCart}
              className="flex-1 border border-slate-700 text-slate-200 rounded-lg py-2 text-sm hover:bg-slate-800"
            >
              Vaciar
            </button>
            <button
              type="button"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-900 rounded-lg py-2 text-sm font-semibold"
            >
              Pagar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
