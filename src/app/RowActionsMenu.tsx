import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";

export type RowAction = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
};

type Props = {
  actions: RowAction[];
  align?: "left" | "right";
  label?: string;
};

export function RowActionsMenu({ actions, align = "right", label = "Actions" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          open
            ? "border-[var(--sgi-blue)]/30 bg-[var(--sgi-blue)]/8 text-[var(--sgi-blue)]"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={label}
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-30 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-lift)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                action.tone === "danger"
                  ? "text-[var(--sgi-red)] hover:bg-[var(--sgi-red)]/10"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
