import { useMemo } from "react";
import {
  BookOpen,
  Download,
  HeartHandshake,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { PlatformRole } from "./roles";
import { ROLE_LABELS } from "./roles";
import type { MemberRecord } from "./memberFormUtils";
import {
  computeMemberListKpis,
  DEMO_ORG_SCOPE,
  filterCollectesByScope,
  filterMembersByScope,
  formatMoney,
  type CollecteLike,
  type OrgScope,
} from "./memberListStats";

type Props = {
  role: PlatformRole;
  members: MemberRecord[];
  collectes: CollecteLike[];
  orgScope?: OrgScope;
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
};

export default function MembersKpiPanel({
  role,
  members,
  collectes,
  orgScope,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onExportPdf,
  onExportExcel,
}: Props) {
  const scope = orgScope || DEMO_ORG_SCOPE[role];
  const range = useMemo(() => ({ from: fromDate, to: toDate }), [fromDate, toDate]);

  const scopedMembers = useMemo(() => filterMembersByScope(members, scope), [members, scope]);
  const scopedCollectes = useMemo(() => filterCollectesByScope(collectes, scope), [collectes, scope]);
  const kpis = useMemo(
    () => computeMemberListKpis(scopedMembers, scopedCollectes, range),
    [scopedMembers, scopedCollectes, range],
  );

  const consolidationHint =
    role === "groupe"
      ? "Bilan du groupe"
      : role === "district"
        ? "Bilan consolidé des groupes du district"
        : role === "chapitre"
          ? "Bilan consolidé des districts du chapitre"
          : "Bilan consolidé des chapitres";

  const cards = [
    { label: "Membres total", value: String(kpis.totalMembres), hint: "Effectif en fin de période", tone: "blue", icon: Users },
    { label: "Abonnés Vague de Paix", value: String(kpis.abonnesVaguePaix), hint: "Effectif abonné", tone: "green", icon: BookOpen },
    { label: "Zaimu ordinaire", value: `${formatMoney(kpis.zaimuOrdinaire)}`, hint: "FCFA validés (période)", tone: "gold", icon: Wallet },
    { label: "Zaimu spécial", value: `${formatMoney(kpis.zaimuSpecial)}`, hint: "FCFA validés (période)", tone: "red", icon: HeartHandshake },
    { label: "Hommes", value: String(kpis.hommes), hint: "Catégorie", tone: "blue", icon: Users },
    { label: "Femmes", value: String(kpis.femmes), hint: "Catégorie", tone: "gold", icon: Users },
    { label: "Jeunes", value: String(kpis.jeunes), hint: "Jeune homme", tone: "blue", icon: Users },
    { label: "Jeunes filles", value: String(kpis.jeunesFilles), hint: "Catégorie", tone: "gold", icon: Users },
    { label: "Avenir", value: String(kpis.avenir), hint: "Catégorie", tone: "green", icon: Sparkles },
    { label: "Sokahan", value: String(kpis.sokahan), hint: "Possesseurs Gohonzon", tone: "red", icon: Sparkles },
  ] as const;

  const toneClass: Record<string, string> = {
    blue: "text-[var(--sgi-blue)] bg-[var(--sgi-blue)]/10",
    gold: "text-[var(--sgi-gold)] bg-[var(--sgi-gold)]/15",
    red: "text-[var(--sgi-red)] bg-[var(--sgi-red)]/10",
    green: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/12",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
      <div
        className="flex flex-col gap-4 border-b border-border p-4 sm:p-5"
        style={{
          background:
            "radial-gradient(ellipse 70% 120% at 0% 0%, rgba(200,151,26,0.12), transparent 55%), linear-gradient(180deg, color-mix(in srgb, var(--sgi-blue) 6%, transparent), transparent)",
        }}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">
            {ROLE_LABELS[role]} · {consolidationHint}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-foreground sm:text-xl">
            Indicateurs consolidés
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Filtre global appliqué à tous les indicateurs, graphiques et exports.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
            <label className="block min-w-[9rem]">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Du
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="dash-field"
              />
            </label>
            <label className="block min-w-[9rem]">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Au
              </span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => onToDateChange(e.target.value)}
                className="dash-field"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={onExportPdf}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Download size={14} /> Export PDF
            </button>
            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--sgi-gold)]/40 bg-[var(--sgi-gold)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--sgi-gold)] transition hover:bg-[var(--sgi-gold)]/20"
            >
              <Download size={14} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 sm:p-4 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-border bg-background/40 p-3 shadow-sm">
              <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl ${toneClass[card.tone]}`}>
                <Icon size={14} />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">{card.label}</p>
              <p
                className="mt-0.5 font-display text-xl font-bold leading-tight text-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {card.value}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">{card.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
