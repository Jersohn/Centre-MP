import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, Trash2, X } from "lucide-react";

export type ConfirmTone = "default" | "danger" | "success" | "info";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Si true : un seul bouton (pas d’annulation). */
  alertOnly?: boolean;
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
};

type ConfirmApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: Omit<ConfirmOptions, "alertOnly" | "cancelLabel"> | string) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmApi | null>(null);

const TONE_UI: Record<
  ConfirmTone,
  { icon: typeof Info; iconClass: string; confirmClass: string }
> = {
  default: {
    icon: Info,
    iconClass: "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]",
    confirmClass: "bg-[var(--sgi-blue)] text-white hover:opacity-90",
  },
  info: {
    icon: Info,
    iconClass: "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]",
    confirmClass: "bg-[var(--sgi-blue)] text-white hover:opacity-90",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
    confirmClass: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  danger: {
    icon: Trash2,
    iconClass: "bg-[var(--sgi-red)]/12 text-[var(--sgi-red)]",
    confirmClass: "bg-[var(--sgi-red)] text-white hover:opacity-90",
  },
};

function ConfirmModalView({
  state,
  onConfirm,
  onCancel,
}: {
  state: ConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!state.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (state.alertOnly) onConfirm();
        else onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.open, state.alertOnly, onConfirm, onCancel]);

  if (!state.open) return null;

  const tone = state.tone || (state.alertOnly ? "info" : "default");
  const ui = TONE_UI[tone];
  const Icon = tone === "danger" && !state.alertOnly ? AlertTriangle : ui.icon;
  const confirmLabel =
    state.confirmLabel || (state.alertOnly ? "Compris" : tone === "danger" ? "Supprimer" : "Confirmer");
  const cancelLabel = state.cancelLabel || "Annuler";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={state.alertOnly ? onConfirm : onCancel}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sgi-confirm-title"
        aria-describedby={state.description ? "sgi-confirm-desc" : undefined}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sgi-tricolor h-1.5 w-full shrink-0" aria-hidden />

        <div className="relative px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
          <button
            type="button"
            onClick={state.alertOnly ? onConfirm : onCancel}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>

          <div
            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${ui.iconClass}`}
          >
            <Icon size={22} />
          </div>

          <h2
            id="sgi-confirm-title"
            className="mt-4 pr-10 font-display text-xl font-semibold text-foreground"
          >
            {state.title}
          </h2>
          {state.description ? (
            <p
              id="sgi-confirm-desc"
              className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
            >
              {state.description}
            </p>
          ) : null}
        </div>

        <div
          className={`grid gap-2 border-t border-border bg-card/95 p-4 sm:px-6 ${
            state.alertOnly ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {!state.alertOnly && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition ${ui.confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
  });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(value);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        tone: options.tone || "default",
        alertOnly: Boolean(options.alertOnly),
      });
    });
  }, []);

  const alert = useCallback(
    async (options: Omit<ConfirmOptions, "alertOnly" | "cancelLabel"> | string) => {
      const opts =
        typeof options === "string"
          ? { title: options, tone: "info" as const }
          : options;
      await confirm({
        ...opts,
        tone: opts.tone || "info",
        alertOnly: true,
        confirmLabel: opts.confirmLabel || "Compris",
      });
    },
    [confirm],
  );

  const api = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <ConfirmModalView state={state} onConfirm={() => close(true)} onCancel={() => close(false)} />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
