import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

type MenuCoords = {
  top: number;
  left: number;
  openUp: boolean;
};

export function RowActionsMenu({ actions, align = "right", label = "Actions" }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const updatePosition = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = menuRef.current?.offsetWidth || 176;
    const menuHeight = menuRef.current?.offsetHeight || actions.length * 44 + 12;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + gap && rect.top > spaceBelow;

    let left =
      align === "right" ? rect.right - menuWidth : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    const top = openUp
      ? Math.max(8, rect.top - menuHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - menuHeight - 8);

    setCoords({ top, left, openUp });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    // Premier placement (estimation), puis recalcul une fois le menu monté.
    updatePosition();
    const raf = window.requestAnimationFrame(() => updatePosition());
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align, actions.length]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
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

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            style={
              coords
                ? { top: coords.top, left: coords.left }
                : { top: -9999, left: -9999, visibility: "hidden" as const }
            }
            className="fixed z-[80] min-w-[11rem] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-lift)]"
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={buttonRef}
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
      {menu}
    </div>
  );
}
