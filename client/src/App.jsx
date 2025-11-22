// client/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useRef } from "react";

import Navbar from "./components/Navbar";
import CartDrawer from "./components/CartDrawer";
import ChatDrawer from "./components/ChatDrawer";

import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import useAuthStore from "./store/useAuthStore";
import useCartStore from "./store/useCartStore";

export default function App() {
  // Auth
  const loadAuth = useAuthStore((s) => s.loadFromStorage);
  const user = useAuthStore((s) => s.user);

  // Carrito
  const items = useCartStore((s) => s.items);

  // Para saber quién era el “dueño” anterior del carrito
  const prevOwnerRef = useRef(null);

  // 1) Al montar la app, cargar auth desde localStorage
  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  // Función helper: genera la clave de storage según usuario
  function getCartKey(ownerId) {
    return ownerId ? `fc_cart_${ownerId}` : "fc_cart_guest";
  }

  // 2) Cuando cambia el usuario (login / logout), guardar carrito del anterior
  //    y cargar carrito del nuevo usuario desde su propia key
  useEffect(() => {
    const currentOwnerId = user?.id || null; // null => invitado
    const prevOwnerId = prevOwnerRef.current;

    // a) Guardar carrito del usuario anterior
    if (prevOwnerId !== null) {
      const prevKey = getCartKey(prevOwnerId);
      const prevItems = useCartStore.getState().items;
      try {
        localStorage.setItem(prevKey, JSON.stringify({ items: prevItems }));
      } catch (e) {
        console.error("Error guardando carrito de", prevOwnerId, e);
      }
    }

    // b) Cargar carrito del usuario actual
    const newKey = getCartKey(currentOwnerId);
    try {
      const raw = localStorage.getItem(newKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          useCartStore.setState({ items: parsed.items });
        } else {
          useCartStore.setState({ items: [] });
        }
      } else {
        // Si no hay nada guardado para ese usuario, carrito vacío
        useCartStore.setState({ items: [] });
      }
    } catch (e) {
      console.error("Error cargando carrito para", currentOwnerId, e);
      useCartStore.setState({ items: [] });
    }

    // Actualizar ref
    prevOwnerRef.current = currentOwnerId;
  }, [user?.id]);

  // 3) Cada vez que cambian los items, persistir el carrito del usuario actual
  useEffect(() => {
    const currentOwnerId = user?.id || null;
    const key = getCartKey(currentOwnerId);
    try {
      localStorage.setItem(key, JSON.stringify({ items }));
    } catch (e) {
      console.error("Error guardando carrito en storage:", e);
    }
  }, [items, user?.id]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        <Navbar />
        <CartDrawer />
        <ChatDrawer />

        <main className="pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
