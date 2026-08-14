import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Filter } from "lucide-react";

type Props = {
  title?: string;
  activeCount?: number;
  summary?: string;
  actions?: ReactNode;
  children: ReactNode;
  storageKey?: string;
};

function defaultOpenForViewport() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 768px)").matches;
}

export default function FilterPanel({
  title = "Filtres",
  activeCount = 0,
  summary,
  actions,
  children,
  storageKey,
}: Props) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    if (storageKey) {
      const stored = sessionStorage.getItem(`filters:${storageKey}`);
      if (stored === "open") return true;
      if (stored === "closed") return false;
    }
    return defaultOpenForViewport();
  });

  useEffect(() => {
    if (!storageKey) return;
    sessionStorage.setItem(`filters:${storageKey}`, open ? "open" : "closed");
  }, [open, storageKey]);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 p-2.5 sm:px-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted/60"
          aria-expanded={open}
        >
          <Filter size={15} className="shrink-0 text-[var(--sgi-blue)]" />
          <span className="truncate">{open ? "Masquer les filtres" : "Afficher les filtres"}</span>
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sgi-blue)] px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`ml-auto shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
          />
        </button>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {!open && (summary || title) ? (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          {summary || title}
        </p>
      ) : null}
      {open ? <div className="border-t border-border p-3 sm:p-4">{children}</div> : null}
    </div>
  );
}
