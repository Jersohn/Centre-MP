import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import type { AiChatMessage, AiChatMode } from "../../services/aiAssistants";
import { FRIENDLY_CHAT_ERROR, sendAiChat, toUserFacingChatError } from "../../services/groqChat";

export type ChatbotWidgetProps = {
  mode: AiChatMode;
  title: string;
  subtitle: string;
  welcome: string;
  suggestions: string[];
  /** Reçoit la question courante pour rechercher dans les pages / données. */
  buildContext: (question: string) => string;
  /** Décalage bas (mobile nav site, etc.) */
  fabOffsetClass?: string;
  accent?: "blue" | "gold";
};

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatbotWidget({
  mode,
  title,
  subtitle,
  welcome,
  suggestions,
  buildContext,
  fabOffsetClass = "bottom-6",
  accent = "blue",
}: ChatbotWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: "welcome", role: "assistant", content: welcome },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const accentBg = accent === "gold" ? "bg-[var(--sgi-gold)]" : "bg-[var(--sgi-blue)]";
  const accentSoft =
    accent === "gold" ? "bg-[var(--sgi-gold)]/12 text-[var(--sgi-gold)]" : "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]";

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const ask = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;

    const userMsg: UiMessage = { id: uid(), role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const conversation: AiChatMessage[] = history
        .filter((m) => m.role === "user" || (m.role === "assistant" && m.id !== "welcome"))
        .map((m) => ({ role: m.role, content: m.content }));

      const reply = await sendAiChat({
        mode,
        messages: conversation,
        context: buildContext(content),
      });

      setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: reply }]);
    } catch (err) {
      const message = toUserFacingChatError(err) || FRIENDLY_CHAT_ERROR;
      setError(null);
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask(input);
    }
  };

  return (
    <div className={`pointer-events-none fixed right-4 z-[60] sm:right-6 ${fabOffsetClass}`}>
      {open && (
        <div className="pointer-events-auto mb-3 flex h-[min(560px,72vh)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_18px_50px_rgba(6,28,51,0.22)]">
          <div className={`${accentBg} relative px-4 py-3 text-white`}>
            <div className="sgi-tricolor absolute inset-x-0 bottom-0 h-0.5 opacity-90" aria-hidden />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                    <Sparkles size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{title}</p>
                    <p className="truncate text-[11px] text-white/80">{subtitle}</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/85 transition hover:bg-white/15 hover:text-white"
                aria-label="Fermer l’assistant"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? `${accentBg} text-white`
                      : "border border-border bg-secondary/40 text-foreground"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <span className={`mb-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${accentSoft}`}>
                      <Bot size={11} /> Assistant
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                Réflexion en cours…
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={busy}
                  onClick={() => void ask(suggestion)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-[var(--sgi-blue)]/35 hover:text-foreground disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="border-t border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
              {error}
            </p>
          )}

          <form onSubmit={onSubmit} className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-2.5 py-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Écrivez votre message…"
                className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition disabled:opacity-40 ${accentBg}`}
                aria-label="Envoyer"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`pointer-events-auto inline-flex items-center gap-2 rounded-full ${accentBg} px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(6,28,51,0.28)] transition hover:opacity-95`}
        aria-expanded={open}
        aria-label={open ? "Fermer l’assistant" : "Ouvrir l’assistant"}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />}
        <span className="hidden sm:inline">{open ? "Fermer" : title}</span>
      </button>
    </div>
  );
}
