import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, X } from "lucide-react";
import type { ExportFieldOption } from "./memberImportExport";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: ExportFieldOption[];
  defaultSelected: string[];
  /** Champs toujours inclus et non décochables (ex. Prénom / Nom). */
  lockedFields?: string[];
  accent?: "blue" | "red";
  onClose: () => void;
  onExport: (payload: { fields: string[]; format: "pdf" | "excel" }) => void;
};

export default function ExportFieldsDialog({
  open,
  title,
  subtitle,
  fields,
  defaultSelected,
  lockedFields = [],
  accent = "blue",
  onClose,
  onExport,
}: Props) {
  const withLocked = (list: string[]) => [...new Set([...lockedFields, ...list])];
  const [selected, setSelected] = useState<string[]>(() => withLocked(defaultSelected));

  useEffect(() => {
    if (open) setSelected(withLocked(defaultSelected));
  }, [open, defaultSelected, lockedFields]);

  const groups = useMemo(() => {
    const map = new Map<string, ExportFieldOption[]>();
    for (const field of fields) {
      const group = field.group || "Champs disponibles";
      const list = map.get(group) || [];
      list.push(field);
      map.set(group, list);
    }
    return [...map.entries()];
  }, [fields]);

  if (!open) return null;

  const accentBtn =
    accent === "red"
      ? "bg-[var(--sgi-red)] hover:opacity-90"
      : "bg-[var(--sgi-blue)] hover:opacity-90";
  const accentSoft =
    accent === "red"
      ? "border-[var(--sgi-red)]/35 bg-[var(--sgi-red)]/10 text-[var(--sgi-red)] hover:bg-[var(--sgi-red)]/15"
      : "border-[var(--sgi-gold)]/40 bg-[var(--sgi-gold)]/10 text-[var(--sgi-gold)] hover:bg-[var(--sgi-gold)]/20";

  const toggle = (key: string) => {
    if (lockedFields.includes(key)) return;
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const selectAll = () => setSelected(withLocked(fields.map((f) => f.key)));
  const selectDefaults = () => setSelected(withLocked(defaultSelected));
  const clearAll = () => setSelected([...lockedFields]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sgi-tricolor h-1.5 w-full shrink-0" aria-hidden />
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitle || "Cochez les champs à inclure, puis lancez l’export PDF ou Excel."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3 sm:px-5">
          <button type="button" onClick={selectDefaults} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Sélection recommandée
          </button>
          <button type="button" onClick={selectAll} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Tout cocher
          </button>
          <button type="button" onClick={clearAll} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Tout décocher
          </button>
          <span className="ml-auto self-center text-xs text-muted-foreground">
            {selected.length} champ{selected.length !== 1 ? "s" : ""} sélectionné{selected.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-5">
            {groups.map(([group, items]) => (
              <div key={group}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {group}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {items.map((field) => {
                    const checked = selected.includes(field.key);
                    const locked = lockedFields.includes(field.key);
                    return (
                      <label
                        key={`${group}-${field.key}`}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                          locked ? "cursor-default" : "cursor-pointer"
                        } ${
                          checked
                            ? "border-[var(--sgi-blue)]/35 bg-[var(--sgi-blue)]/8 text-foreground"
                            : "border-border bg-background/50 text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggle(field.key)}
                          className="h-4 w-4 accent-[var(--sgi-blue)] disabled:opacity-70"
                        />
                        <span className="font-medium">
                          {field.label}
                          {locked ? (
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">(toujours inclus)</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => onExport({ fields: selected, format: "pdf" })}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${accentBtn}`}
          >
            <FileText size={15} />
            Exporter PDF
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => onExport({ fields: selected, format: "excel" })}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${accentSoft}`}
          >
            <FileSpreadsheet size={15} />
            Exporter Excel
          </button>
        </div>
      </div>
    </div>
  );
}
