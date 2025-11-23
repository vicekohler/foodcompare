// client/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";

import Navbar from "./components/Navbar";
import CartDrawer from "./components/CartDrawer";
import ChatDrawer from "./components/ChatDrawer";
import Toast from "./components/Toast"; // ⬅ NUEVO

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

  // Carrito (vinculado a usuario)
  const setCurrentUser = useCartStore((s) => s.setCurrentUser);

  // Cargar sesión al montar
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Cada vez que cambie el usuario, apuntar el carrito al dueño correcto
  useEffect(() => {
    setCurrentUser(user?.id || null);
  }, [user?.id, setCurrentUser]);

  return (
    <BrowserRouter>
      <I18nProvider>
        <div className="min-h-screen bg-slate-950 text-slate-50">
          <Navbar />
          <CartDrawer />
          <ChatDrawer />
          <Toast /> {/* ⬅ AQUÍ se muestra el toast */}

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
