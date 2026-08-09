import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Check, Plus, RefreshCw, Search } from "lucide-react";

type Kpi = {
  label: string;
  value: string | number;
  tone?: string;
};

type Props = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  kpis: Kpi[];
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  filters?: ReactNode;
  onRefresh: () => void;
  loading?: boolean;
  onCreate: () => void;
  createLabel: string;
  toast?: string | null;
  children: ReactNode;
  detail: ReactNode;
};

export function OrgPageShell({
  title,
  subtitle,
  icon: Icon,
  kpis,
  query,
  onQueryChange,
  searchPlaceholder,
  filters,
  onRefresh,
  loading,
  onCreate,
  createLabel,
  toast,
  children,
  detail,
}: Props) {
  return (
    <div className="dash-page space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div
          className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5"
          style={{
            background:
              "radial-gradient(ellipse 70% 120% at 0% 0%, rgba(200,151,26,0.14), transparent 55%), linear-gradient(180deg, color-mix(in srgb, var(--sgi-blue) 7%, transparent), transparent)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sgi-blue)] text-white shadow-sm">
              <Icon size={20} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">
                Organisation
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onRefresh}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : undefined} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-3.5 py-2.5 text-sm font-medium text-white"
            >
              <Plus size={15} />
              {createLabel}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--sgi-blue)]/20 bg-[var(--sgi-blue)]/5 px-4 py-3 text-sm text-foreground">
          <Check size={15} className="text-[var(--sgi-blue)]" />
          {toast}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-card px-5 py-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</div>
            <div className={`mt-2 font-display text-3xl font-semibold ${kpi.tone || "text-[var(--sgi-blue)]"}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)]">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <div className="space-y-3">
              <label className="relative block">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-2xl border border-border bg-input-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
                />
              </label>
              {filters}
            </div>
          </div>
          <div className="max-h-[36rem] space-y-2 overflow-y-auto p-3 sm:p-4">{children}</div>
        </section>

        <aside className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">{detail}</aside>
      </div>
    </div>
  );
}

export function OrgEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-14 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function OrgDetailEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="font-display text-base font-semibold text-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">Sélectionnez un élément dans la liste pour afficher sa fiche.</p>
    </div>
  );
}
