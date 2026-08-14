import { useEffect, useMemo, useState } from "react";
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
  FileSpreadsheet,
  FileText,
  Layers3,
  MapPinned,
  Users,
} from "lucide-react";
import type { PlatformRole } from "./roles";
import { ROLE_LABELS } from "./roles";
import {
  buildDashboardScope,
  exportDashboardExcel,
  exportDashboardPdf,
} from "./dashboardStats";
import { useOpsData } from "./opsDataStore";
import { useOrgTree } from "./useOrgTree";
import {
  DEMO_ORG_SCOPE,
  filterCollectesByScope,
  filterMembersByScope,
  orgScopeFromProfile,
  primaryOrgUnitKind,
  viewOrgScopeFromFilters,
  type OrgScope,
} from "./memberListStats";
import { fetchMyProfile, hasRemoteProfiles } from "../services/profileService";

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

export default function RoleDashboard({
  role,
  orgScope: orgScopeProp,
}: {
  role: PlatformRole;
  orgScope?: OrgScope;
}) {
  const [fromDate, setFromDate] = useState(yearStartISO);
  const [toDate, setToDate] = useState(todayISO);
  const [chapitreFilter, setChapitreFilter] = useState("Tous");
  const [districtFilter, setDistrictFilter] = useState("Tous");
  const [groupeFilter, setGroupeFilter] = useState("Tous");
  const { members, collectes, loading } = useOpsData();
  const orgTree = useOrgTree();
  const [orgScope, setOrgScope] = useState<OrgScope>(
    () => orgScopeProp || DEMO_ORG_SCOPE[role],
  );

  useEffect(() => {
    if (orgScopeProp) {
      setOrgScope(orgScopeProp);
      return;
    }
    let cancelled = false;
    async function loadScope() {
      if (hasRemoteProfiles()) {
        const { data } = await fetchMyProfile();
        if (!cancelled && data) {
          let chapitre = data.chapitre_name || "";
          let district = data.district_name || "";
          let groupe = data.groupe_name || "";
          if ((!chapitre || !district || !groupe) && (data.chapitre_id || data.district_id || data.groupe_id)) {
            const names = orgTree.nameOf({
              chapitreId: data.chapitre_id || "",
              districtId: data.district_id || "",
              groupeId: data.groupe_id || "",
            });
            chapitre = chapitre || names.chapitre;
            district = district || names.district;
            groupe = groupe || names.groupe;
          }
          setOrgScope(orgScopeFromProfile(role, { chapitre, district, groupe }));
        } else if (!cancelled) {
          setOrgScope(orgScopeFromProfile(role, {}));
        }
      } else if (!cancelled) {
        setOrgScope(DEMO_ORG_SCOPE[role]);
      }
    }
    void loadScope();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, orgScopeProp, orgTree.chapitres.length]);

  useEffect(() => {
    setChapitreFilter(orgScope.chapitre || "Tous");
    setDistrictFilter(orgScope.district || "Tous");
    setGroupeFilter(orgScope.groupe || "Tous");
  }, [orgScope.chapitre, orgScope.district, orgScope.groupe]);

  const chapitreLocked = Boolean(orgScope.chapitre);
  const districtLocked = Boolean(orgScope.district);
  const groupeLocked = Boolean(orgScope.groupe);

  const chapitreFilterOptions = useMemo(
    () => ["Tous", ...orgTree.chapitres.map((item) => item.name)],
    [orgTree.chapitres],
  );
  const districtFilterOptions = useMemo(() => {
    if (chapitreFilter === "Tous") {
      return ["Tous", ...orgTree.districts.map((item) => item.name)];
    }
    const chapitre = orgTree.chapitres.find((item) => item.name === chapitreFilter);
    const districts = chapitre
      ? orgTree.districtsForChapitreId(chapitre.id).map((item) => item.name)
      : [];
    return ["Tous", ...districts];
  }, [chapitreFilter, orgTree]);
  const groupeFilterOptions = useMemo(() => {
    if (districtFilter !== "Tous") {
      const district = orgTree.districts.find((item) => item.name === districtFilter);
      const groupes = district
        ? orgTree.groupesForDistrictId(district.id).map((item) => item.name)
        : [];
      return ["Tous", ...groupes];
    }
    if (chapitreFilter !== "Tous") {
      const chapitre = orgTree.chapitres.find((item) => item.name === chapitreFilter);
      const groupes = chapitre
        ? orgTree.districtsForChapitreId(chapitre.id).flatMap((district) =>
            orgTree.groupesForDistrictId(district.id).map((item) => item.name),
          )
        : [];
      return ["Tous", ...Array.from(new Set(groupes))];
    }
    return ["Tous", ...orgTree.groupes.map((item) => item.name)];
  }, [chapitreFilter, districtFilter, orgTree]);

  const viewScope = useMemo(
    () =>
      viewOrgScopeFromFilters(orgScope, {
        chapitre: chapitreFilter,
        district: districtFilter,
        groupe: groupeFilter,
      }),
    [orgScope, chapitreFilter, districtFilter, groupeFilter],
  );

  const viewRole: PlatformRole = viewScope.groupe
    ? "groupe"
    : viewScope.district
      ? "district"
      : viewScope.chapitre && (role === "admin" || role === "centre")
        ? "chapitre"
        : role;

  const scopedMembers = useMemo(
    () => filterMembersByScope(members, viewScope),
    [members, viewScope],
  );
  const scopedCollectes = useMemo(
    () => filterCollectesByScope(collectes, viewScope),
    [collectes, viewScope],
  );

  const orgSnapshot = useMemo(() => {
    const chapitre = orgTree.chapitres.find((item) => item.name === viewScope.chapitre);
    const district = orgTree.districts.find((item) => item.name === viewScope.district);
    let chapitres = orgTree.chapitres;
    let districts = orgTree.districts;
    let groupes = orgTree.groupes;
    if (chapitre) {
      chapitres = [chapitre];
      districts = orgTree.districtsForChapitreId(chapitre.id);
      groupes = districts.flatMap((d) => orgTree.groupesForDistrictId(d.id));
    }
    if (district) {
      districts = [district];
      groupes = orgTree.groupesForDistrictId(district.id);
    }
    if (viewScope.groupe) {
      groupes = groupes.filter((item) => item.name === viewScope.groupe);
    }
    return {
      chapitres: chapitres.map((item) => ({ id: item.id, name: item.name })),
      districts: districts.map((item) => ({
        id: item.id,
        name: item.name,
        chapitre_id: item.chapitre_id,
        chapitre_name: item.chapitre_name,
      })),
      groupes: groupes.map((item) => ({
        id: item.id,
        name: item.name,
        district_id: item.district_id,
        district_name: item.district_name,
        chapitre_id: item.chapitre_id,
        chapitre_name: item.chapitre_name,
      })),
    };
  }, [orgTree, viewScope.chapitre, viewScope.district, viewScope.groupe]);

  const scope = useMemo(
    () =>
      buildDashboardScope(viewRole, scopedMembers, orgSnapshot, scopedCollectes, {
        chapitre: viewScope.chapitre,
        district: viewScope.district,
        groupe: viewScope.groupe,
      }),
    [viewRole, scopedMembers, orgSnapshot, scopedCollectes, viewScope],
  );
  const RoleIcon = ICON_BY_ROLE[viewRole] || ICON_BY_ROLE[role];
  const dataLoading = loading || orgTree.loading;
  const unitKind = primaryOrgUnitKind(viewRole);

  const scopeSlug = (viewScope.groupe || viewScope.district || viewScope.chapitre || role)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_|_$/g, "");

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
      scopeLabel: viewScope.label,
      filename: `dashboard_${scopeSlug}_${fromDate}_${toDate}.pdf`,
    });
  };

  const handleExcel = () => {
    exportDashboardExcel({
      scope,
      roleLabel: ROLE_LABELS[role],
      fromDate,
      toDate,
      scopeLabel: viewScope.label,
      members: scopedMembers,
      collectes: scopedCollectes,
      filename: `dashboard_${scopeSlug}_${fromDate}_${toDate}.xlsx`,
    });
  };

  return (
    <div className="dash-page gap-5 sm:gap-6">
      {dataLoading && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Chargement des indicateurs…
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div
          className="flex flex-col gap-4 p-4 sm:p-5"
          style={{
            background:
              "radial-gradient(ellipse 70% 120% at 0% 0%, rgba(200,151,26,0.14), transparent 55%), linear-gradient(180deg, color-mix(in srgb, var(--sgi-blue) 7%, transparent), transparent)",
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sgi-blue)] text-white shadow-sm">
                <RoleIcon size={20} />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">
                  {ROLE_LABELS[role]} · {unitKind}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground sm:text-2xl">
                  {scope.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{scope.subtitle}</p>
                {(viewScope.chapitre || viewScope.district || viewScope.groupe) && (
                  <p className="mt-2 inline-flex items-center rounded-lg border border-[var(--sgi-blue)]/20 bg-[var(--sgi-blue)]/8 px-2.5 py-1 text-xs font-semibold text-[var(--sgi-blue)]">
                    Périmètre : {viewScope.label}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/80 p-3 sm:p-4">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <CalendarRange size={14} className="text-[var(--sgi-blue)]" />
              Période, périmètre & export
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="block min-w-0 sm:min-w-[10rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Du</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="dash-field"
                />
              </label>
              <label className="block min-w-0 sm:min-w-[10rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Au</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="dash-field"
                />
              </label>
              <label className="block min-w-0 sm:min-w-[9rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Chapitre</span>
                <select
                  value={chapitreFilter}
                  disabled={chapitreLocked}
                  onChange={(e) => {
                    const nextChapitre = e.target.value;
                    setChapitreFilter(nextChapitre);
                    if (nextChapitre !== "Tous") {
                      const chapitre = orgTree.chapitres.find((item) => item.name === nextChapitre);
                      const allowedDistricts = chapitre
                        ? orgTree.districtsForChapitreId(chapitre.id).map((item) => item.name)
                        : [];
                      if (districtFilter !== "Tous" && !allowedDistricts.includes(districtFilter)) {
                        setDistrictFilter("Tous");
                      }
                      const allowedGroupes = chapitre
                        ? orgTree.districtsForChapitreId(chapitre.id).flatMap((d) =>
                            orgTree.groupesForDistrictId(d.id).map((item) => item.name),
                          )
                        : [];
                      if (groupeFilter !== "Tous" && !allowedGroupes.includes(groupeFilter)) {
                        setGroupeFilter("Tous");
                      }
                    }
                  }}
                  className="dash-field disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {chapitreFilterOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 sm:min-w-[9rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">District</span>
                <select
                  value={districtFilter}
                  disabled={districtLocked}
                  onChange={(e) => {
                    const nextDistrict = e.target.value;
                    setDistrictFilter(nextDistrict);
                    if (nextDistrict !== "Tous" && groupeFilter !== "Tous") {
                      const district = orgTree.districts.find((item) => item.name === nextDistrict);
                      const allowed = district
                        ? orgTree.groupesForDistrictId(district.id).map((item) => item.name)
                        : [];
                      if (!allowed.includes(groupeFilter)) setGroupeFilter("Tous");
                    }
                  }}
                  className="dash-field disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {districtFilterOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="block min-w-0 sm:min-w-[9rem]">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Groupe</span>
                <select
                  value={groupeFilter}
                  disabled={groupeLocked}
                  onChange={(e) => setGroupeFilter(e.target.value)}
                  className="dash-field disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {groupeFilterOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:justify-end">
                <button
                  type="button"
                  onClick={handlePdf}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  <FileText size={15} />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handleExcel}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--sgi-gold)]/40 bg-[var(--sgi-gold)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--sgi-gold)] transition hover:bg-[var(--sgi-gold)]/20"
                >
                  <FileSpreadsheet size={15} />
                  Excel
                </button>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              L’export reprend le tableau de bord du périmètre affiché ({viewScope.label}) : KPI, détail par {scope.unitLabel.toLowerCase()} et liste des membres.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {scope.kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className={`mb-3 inline-flex rounded-xl px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${TONE[kpi.tone]}`}>
              {kpi.label}
            </div>
            <p className="mt-1 font-display text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
              {kpi.value}
            </p>
            {kpi.hint ? <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p> : null}
          </div>
        ))}
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
                  {[scope.unitLabel, "Membres", "Actifs", "Vague Paix", "Gohonzon", "Zaimu ord.", "Zaimu sp."].map((h) => (
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
                    <td className="px-4 py-3 font-mono text-foreground">{row.gohonzon}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {new Intl.NumberFormat("fr-FR").format(row.zaimuOrdinaire)}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {new Intl.NumberFormat("fr-FR").format(row.zaimuSpecial)}
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
