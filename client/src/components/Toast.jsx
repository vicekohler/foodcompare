// client/src/components/Toast.jsx
import { useEffect } from "react";
import useUIStore from "../store/useUIStore";

export default function Toast() {
  const toast = useUIStore((s) => s.toast);
  const hideToast = useUIStore((s) => s.hideToast);

  // Autocierre
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => {
      hideToast();
    }, 2500); // 2,5s
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  if (!toast) return null;

  const bgClass =
    toast.type === "error"
      ? "bg-red-500 text-slate-950"
      : "bg-emerald-500 text-slate-950";

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60]">
      <div
        className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${bgClass}`}
      >
        {toast.message}
      </div>
    </div>
  );
}
