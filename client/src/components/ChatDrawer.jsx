// src/components/ChatDrawer.jsx
import useUIStore from "../store/useUIStore";

export default function ChatDrawer() {
  const isChatOpen = useUIStore((s) => s.isChatOpen);
  const closeChat = useUIStore((s) => s.closeChat);

  if (!isChatOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="flex-1 bg-black/40"
        onClick={closeChat}
        aria-hidden="true"
      />
      <aside className="w-full max-w-md bg-slate-950 border-l border-slate-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Asistente nutricional</h2>
          <button
            type="button"
            onClick={closeChat}
            className="text-slate-400 hover:text-slate-200"
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto text-sm text-slate-300 space-y-2">
          <p>
            Aquí más adelante puedes conectar un chatbot que recomiende
            productos saludables según tus preferencias.
          </p>
          <p>Por ahora es solo un placeholder visual.</p>
        </div>

        <form className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Escribe tu pregunta..."
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
          />
          <button
            type="submit"
            className="bg-emerald-500 text-slate-900 rounded-lg px-3 text-sm font-semibold hover:bg-emerald-400"
          >
            Enviar
          </button>
        </form>
      </aside>
    </div>
  );
}
