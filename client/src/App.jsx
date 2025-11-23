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
import Profile from "./pages/Profile";
import AuthCallback from "./pages/AuthCallback";

import useAuthStore from "./store/useAuthStore";
import useCartStore from "./store/useCartStore";
import { I18nProvider } from "./i18n/I18nContext";

export default function App() {
  // Auth
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const user = useAuthStore((s) => s.user);

  // Carrito
  const items = useCartStore((s) => s.items);
  const prevOwnerRef = useRef(null);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  function getCartKey(ownerId) {
    return ownerId ? `fc_cart_${ownerId}` : "fc_cart_guest";
  }

  // swap de carrito al cambiar de usuario
  useEffect(() => {
    const currentOwnerId = user?.id || null;
    const prevOwnerId = prevOwnerRef.current;

    if (prevOwnerId !== null) {
      const prevKey = getCartKey(prevOwnerId);
      const prevItems = useCartStore.getState().items;
      try {
        localStorage.setItem(prevKey, JSON.stringify({ items: prevItems }));
      } catch (e) {
        console.error("Error guardando carrito de", prevOwnerId, e);
      }
    }

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
        useCartStore.setState({ items: [] });
      }
    } catch (e) {
      console.error("Error cargando carrito para", currentOwnerId, e);
      useCartStore.setState({ items: [] });
    }

    prevOwnerRef.current = currentOwnerId;
  }, [user?.id]);

  // persistir carrito
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
      <I18nProvider>
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
              <Route path="/profile" element={<Profile />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
            </Routes>
          </main>
        </div>
      </I18nProvider>
    </BrowserRouter>
  );
}
