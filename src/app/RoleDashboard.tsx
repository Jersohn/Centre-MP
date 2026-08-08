import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Building2,
  CalendarRange,
  Download,
  FileSpreadsheet,
  FileText,
  Layers3,
  MapPinned,
  Users,
} from "lucide-react";
import type { PlatformRole } from "./roles";
import { ROLE_LABELS } from "./roles";
import { MEMBERS_SEED } from "./membersData";
import {
  buildDashboardScope,
  exportDashboardExcel,
  exportDashboardPdf,
} from "./dashboardStats";

const TONE: Record<string, string> = {
  blue: "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]",
  gold: "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]",
  red: "bg-[var(--sgi-red)]/10 text-[var(--sgi-red)]",
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
};

const ICON_BY_ROLE: Record<PlatformRole, typeof Users> = {
  admin: Building2,
  centre: Building2,
  chapitre: Layers3,
  district: MapPinned,
  groupe: Users,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function yearStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

export default function RoleDashboard({ role }: { role: PlatformRole }) {
  const [fromDate, setFromDate] = useState(yearStartISO);
  const [toDate, setToDate] = useState(todayISO);
  const members = MEMBERS_SEED;
  const scope = useMemo(() => buildDashboardScope(role, members), [role, members]);
  const RoleIcon = ICON_BY_ROLE[role];

  const chartData = scope.rows.map((row) => ({
    name: row.label.replace("Chapitre ", "Ch. ").replace("District ", "D. ").replace("Groupe ", "G. "),
    Membres: row.membres,
    Actifs: row.actifs,
  }));

  const handlePdf = () => {
    exportDashboardPdf({
      scope,
      roleLabel: ROLE_LABELS[role],
      fromDate,
      toDate,
      filename: `dashboard_${role}_${fromDate}_${toDate}.pdf`,
    });
  };

  const handleExcel = () => {
    exportDashboardExcel({
      scope,
      roleLabel: ROLE_LABELS[role],
      fromDate,
      toDate,
      members,
      filename: `dashboard_${role}_${fromDate}_${toDate}.xlsx`,
    });
  };

  return (
    <div className="dash-page gap-5 sm:gap-6">
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
              <RoleIcon size={20} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">
                {ROLE_LABELS[role]}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl">{scope.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{scope.subtitle}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground">
            <CalendarRange size={14} className="text-[var(--sgi-blue)]" />
            Période d’analyse & export
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {scope.kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`mb-3 inline-flex rounded-xl px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${TONE[kpi.tone]}`}>
              {kpi.hint}
            </div>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="sgi-tricolor-soft h-1 w-full opacity-80" aria-hidden />
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Exporter le rapport</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF structuré (charte SGI) ou classeur Excel multi-feuilles, filtrés par période.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end lg:w-auto">
            <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Du</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="dash-field"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Au</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="dash-field"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={handlePdf}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <FileText size={15} />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExcel}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--sgi-gold)]/40 bg-[var(--sgi-gold)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--sgi-gold)] transition hover:bg-[var(--sgi-gold)]/20"
              >
                <FileSpreadsheet size={15} />
                Export Excel
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 border-t border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground sm:grid-cols-3 sm:px-5">
          <p className="inline-flex items-center gap-1.5">
            <Download size={12} /> Résumé + KPI
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Layers3 size={12} /> Tableau par {scope.unitLabel.toLowerCase()}
          </p>
          <p className="inline-flex items-center gap-1.5">
            <Users size={12} /> Liste nominative des membres
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-foreground">Statistiques par {scope.unitLabel.toLowerCase()}</h3>
            <p className="text-xs text-muted-foreground">
              {scope.rows.length} {scope.unitPlural.toLowerCase()} — effectifs, activité et finances
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {[scope.unitLabel, "Membres", "Actifs", "Vague Paix", "Zaimu", "Dons"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scope.rows.map((row) => (
                  <tr key={row.key} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{row.membres}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{row.actifs}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{row.vaguePaix}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {new Intl.NumberFormat("fr-FR").format(row.zaimu)}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {new Intl.NumberFormat("fr-FR").format(row.dons)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">{scope.chartTitle}</h3>
          <p className="mb-4 text-xs text-muted-foreground">Comparaison visuelle des effectifs</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6478A0" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="Membres" fill="var(--sgi-blue)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Actifs" fill="var(--sgi-gold)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
