import { useMemo } from "react";
import { HeartHandshake, Target, Wallet } from "lucide-react";
import type { PlatformRole } from "./roles";
import type { CollectePayment } from "./zaimuQuota";
import {
  buildQuotaView,
  formatCdf,
  ZAIMU_SPECIAL_CAMPAIGN,
} from "./zaimuQuota";

type Props = {
  role: PlatformRole;
  collectes: CollectePayment[];
  compact?: boolean;
};

export default function ZaimuQuotaPanel({ role, collectes, compact = false }: Props) {
  const view = useMemo(
    () => buildQuotaView(role, ZAIMU_SPECIAL_CAMPAIGN, collectes),
    [role, collectes]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{view.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{view.subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <Target size={14} className="text-[var(--sgi-red)]" />
          {ZAIMU_SPECIAL_CAMPAIGN.label}
        </div>
      </div>

      <div className={`grid gap-3 p-4 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}`}>
        <QuotaCard
          icon={Target}
          label="Cota assignée"
          value={`${formatCdf(view.headline.assigne)} CDF`}
          hint="Montant à couvrir"
          tone="red"
        />
        <QuotaCard
          icon={HeartHandshake}
          label="Zaimu spécial payé"
          value={`${formatCdf(view.headline.paye)} CDF`}
          hint={`${view.headline.progress}% de la cota`}
          tone="gold"
        />
        <QuotaCard
          icon={Wallet}
          label="Reste à payer"
          value={`${formatCdf(view.headline.reste)} CDF`}
          hint="Cota − payé"
          tone="blue"
        />
        <QuotaCard
          icon={Wallet}
          label="Zaimu ordinaire payé"
          value={`${formatCdf(view.zaimuOrdinairePaye)} CDF`}
          hint="Collectes validées (périmètre)"
          tone="green"
        />
      </div>

      <div className="px-4 pb-2 sm:px-5">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[var(--sgi-gold)] transition-all"
            style={{ width: `${view.headline.progress}%` }}
          />
        </div>
      </div>

      <div className="overflow-x-auto p-4 pt-3 sm:p-5 sm:pt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Répartition par {view.childLabel.toLowerCase()} — payé / reste
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[view.childLabel, "Assigné", "Payé", "Reste", "Avancement"].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.children.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-sm text-muted-foreground">
                  Aucune répartition sur ce périmètre.
                </td>
              </tr>
            ) : (
              view.children.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2.5 font-medium text-foreground">{row.label}</td>
                  <td className="px-3 py-2.5 font-mono text-foreground">{formatCdf(row.assigne)}</td>
                  <td className="px-3 py-2.5 font-mono text-emerald-700 dark:text-emerald-400">
                    {formatCdf(row.paye)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[var(--sgi-red)]">{formatCdf(row.reste)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[var(--sgi-blue)]"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{row.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotaCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint: string;
  tone: "red" | "gold" | "blue" | "green";
}) {
  const toneClass = {
    red: "text-[var(--sgi-red)] bg-[var(--sgi-red)]/10",
    gold: "text-[var(--sgi-gold)] bg-[var(--sgi-gold)]/15",
    blue: "text-[var(--sgi-blue)] bg-[var(--sgi-blue)]/10",
    green: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/12",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3.5">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon size={14} />
      </div>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
        {value}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
