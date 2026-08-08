import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarRange,
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
  resolveDateRange,
  type CollecteLike,
  type TimeFilterMode,
} from "./memberListStats";

const MONTHS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

const MODE_OPTIONS: { key: TimeFilterMode; label: string }[] = [
  { key: "annee", label: "Année" },
  { key: "mois", label: "Mois" },
  { key: "semaine", label: "Semaine" },
  { key: "periode", label: "Période" },
];

type Props = {
  role: PlatformRole;
  members: MemberRecord[];
  collectes: CollecteLike[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function MembersKpiPanel({ role, members, collectes }: Props) {
  const now = new Date();
  const [mode, setMode] = useState<TimeFilterMode>("annee");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fromDate, setFromDate] = useState(`${now.getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(todayISO());

  const scope = DEMO_ORG_SCOPE[role];
  const range = useMemo(
    () => resolveDateRange(mode, { year, month, fromDate, toDate, now }),
    [mode, year, month, fromDate, toDate]
  );

  const scopedMembers = useMemo(() => filterMembersByScope(members, scope), [members, scope]);
  const scopedCollectes = useMemo(() => filterCollectesByScope(collectes, scope), [collectes, scope]);
  const kpis = useMemo(
    () => computeMemberListKpis(scopedMembers, scopedCollectes, range),
    [scopedMembers, scopedCollectes, range]
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
    { label: "Zaimu ordinaire", value: `${formatMoney(kpis.zaimuOrdinaire)}`, hint: "CDF validés (période)", tone: "gold", icon: Wallet },
    { label: "Zaimu spécial", value: `${formatMoney(kpis.zaimuSpecial)}`, hint: "CDF validés (période)", tone: "red", icon: HeartHandshake },
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

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">
              {ROLE_LABELS[role]} · {consolidationHint}
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-foreground sm:text-xl">
              Indicateurs membres
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{scope.label}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground">
            <CalendarRange size={14} className="text-[var(--sgi-blue)]" />
            {range.from} → {range.to}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-background/70 p-1">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setMode(opt.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === opt.key
                    ? "bg-[var(--sgi-blue)] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
            {(mode === "annee" || mode === "mois") && (
              <label className="block min-w-[7rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Année
                </span>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="dash-field"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode === "mois" && (
              <label className="block min-w-[9rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Mois
                </span>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="dash-field"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode === "periode" && (
              <>
                <label className="block min-w-[9rem]">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Du
                  </span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
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
                    onChange={(e) => setToDate(e.target.value)}
                    className="dash-field"
                  />
                </label>
              </>
            )}
            {mode === "semaine" && (
              <p className="col-span-2 self-center text-xs text-muted-foreground sm:col-span-1">
                Semaine civile en cours (lundi → dimanche)
              </p>
            )}
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
