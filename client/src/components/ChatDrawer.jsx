// src/components/ChatDrawer.jsx
import { useState, useEffect, useRef } from "react";
import useUIStore from "../store/useUIStore";
import { sendAiChatMessage } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

export default function ChatDrawer() {
  const isChatOpen = useUIStore((s) => s.isChatOpen);
  const closeChat = useUIStore((s) => s.closeChat);
  const { lang } = useI18n();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  /* ======================================================
     Mensaje de bienvenida según idioma
  ====================================================== */
  useEffect(() => {
    if (!isChatOpen) return;

    let welcome;
    if (lang === "en") {
      welcome =
        "Hi! I'm your nutrition assistant. Ask me about products, labels, healthier substitutes or tips to improve your grocery shopping.";
    } else if (lang === "pt") {
      welcome =
        "Olá! Sou o seu assistente de nutrição. Pergunte sobre produtos, rótulos, substitutos mais saudáveis ou dicas para melhorar suas compras no supermercado.";
    } else {
      welcome =
        "¡Hola! Soy tu asistente de nutrición. Pregúntame sobre productos, etiquetas, sustitutos más saludables o tips para mejorar tus compras en el supermercado.";
    }

    setMessages([{ role: "assistant", content: welcome }]);
    setError("");
    setInput("");
  }, [lang, isChatOpen]);

  /* ======================================================
     Scroll automático
  ====================================================== */
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  /* ======================================================
     Enviar mensaje
  ====================================================== */
  async function handleSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];

    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    const resp = await sendAiChatMessage({ messages: newMessages, lang });

    if (!resp.ok) {
      let msg =
        lang === "en"
          ? resp.error || "There was an error contacting the assistant."
          : lang === "pt"
          ? resp.error || "Ocorreu um erro ao contactar o assistente."
          : resp.error || "Hubo un error al contactar al asistente.";

      setError(msg);
      setLoading(false);
      return;
    }

    const reply = resp.reply || "";

    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  if (!isChatOpen) return null;

  /* ======================================================
     RENDER
  ====================================================== */

  return (
    // Dejamos espacio para el navbar (pt-16 = 4rem)
    <div className="fixed inset-0 z-40 flex justify-end pt-16">
      {/* Overlay (clic para cerrar) */}
      <div
        className="flex-1 bg-black/40"
        aria-hidden="true"
        onClick={closeChat}
      />

      {/* Panel del chat */}
      <aside className="h-full w-full max-w-md bg-slate-950 border-l border-slate-800 p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {lang === "en"
                ? "Nutrition assistant"
                : lang === "pt"
                ? "Assistente nutricional"
                : "Asistente nutricional"}
            </h2>
            <p className="text-[11px] text-slate-400">
              {lang === "en"
                ? "Ask about products, labels and healthy choices"
                : lang === "pt"
                ? "Pergunte sobre produtos, rótulos e escolhas saudáveis"
                : "Pregunta sobre productos, etiquetas y opciones más saludables"}
            </p>
          </div>

          <button
            type="button"
            onClick={closeChat}
            title={lang === "en" ? "Close" : lang === "pt" ? "Fechar" : "Cerrar"}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-600 text-slate-300 hover:text-white hover:border-slate-300"
          >
            ✕
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto text-sm text-slate-300 space-y-2 pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.role === "assistant"
                  ? "bg-slate-800 text-slate-100"
                  : "bg-emerald-500 text-slate-900 ml-auto"
              }`}
            >
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="max-w-[60%] rounded-2xl px-3 py-2 text-xs bg-slate-800 text-slate-300">
              {lang === "en"
                ? "Thinking..."
                : lang === "pt"
                ? "Pensando..."
                : "Pensando..."}
            </div>
          )}

          {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              lang === "en"
                ? "Type your question..."
                : lang === "pt"
                ? "Escreva sua pergunta..."
                : "Escribe tu pregunta..."
            }
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-400 text-slate-100"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-emerald-500 text-slate-900 rounded-lg px-3 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {lang === "en" ? "Send" : lang === "pt" ? "Enviar" : "Enviar"}
          </button>
        </form>
      </aside>
    </div>
  );
}
