import type { MemberRecord } from "./memberFormUtils";
import type { PlatformRole } from "./roles";
import { defaultChapitre, defaultDistrict, defaultGroupe } from "./orgHierarchy";

export type CollecteLike = {
  id?: string;
  membre?: string;
  type: "vague-paix" | "zaimu-ordinaire" | "zaimu-special";
  montant: number;
  date: string;
  statut: string;
  chapitre: string;
  district: string;
  groupe: string;
};

export type TimeFilterMode = "annee" | "mois" | "semaine" | "periode";

export type OrgScope = {
  label: string;
  chapitre?: string;
  district?: string;
  groupe?: string;
};

const DEMO_CHAPITRE = defaultChapitre(); // Rissho Ankoku Ron
const DEMO_DISTRICT = defaultDistrict(DEMO_CHAPITRE); // District Bodhisattva (3 groupes)
const DEMO_GROUPE = defaultGroupe(DEMO_CHAPITRE, DEMO_DISTRICT); // BODDHISATTVA

/** Périmètre démo par profil (fallback local uniquement). */
export const DEMO_ORG_SCOPE: Record<PlatformRole, OrgScope> = {
  groupe: {
    label: `${DEMO_GROUPE} — ${DEMO_DISTRICT} · ${DEMO_CHAPITRE}`,
    chapitre: DEMO_CHAPITRE,
    district: DEMO_DISTRICT,
    groupe: DEMO_GROUPE,
  },
  district: {
    label: `${DEMO_DISTRICT} — ${DEMO_CHAPITRE}`,
    chapitre: DEMO_CHAPITRE,
    district: DEMO_DISTRICT,
  },
  chapitre: {
    label: `${DEMO_CHAPITRE} (tous districts)`,
    chapitre: DEMO_CHAPITRE,
  },
  centre: { label: "Centre Miroir Parfait — bilan consolidé" },
  admin: { label: "Administration — bilan consolidé du centre" },
};

/** Périmètre réel depuis le profil connecté (centre/admin = tout le centre). */
export function orgScopeFromProfile(
  role: PlatformRole,
  names: { chapitre?: string | null; district?: string | null; groupe?: string | null },
): OrgScope {
  const chapitre = (names.chapitre || "").trim();
  const district = (names.district || "").trim();
  const groupe = (names.groupe || "").trim();

  if (role === "admin") {
    return { label: "Administration — bilan consolidé du centre" };
  }
  if (role === "centre") {
    return { label: "Centre Miroir Parfait" };
  }
  if (role === "chapitre") {
    return {
      label: chapitre ? `${chapitre} (tous districts)` : "Chapitre",
      chapitre: chapitre || undefined,
    };
  }
  if (role === "district") {
    return {
      label: [district, chapitre].filter(Boolean).join(" — ") || "District",
      chapitre: chapitre || undefined,
      district: district || undefined,
    };
  }
  return {
    label: [groupe, district, chapitre].filter(Boolean).join(" · ") || "Groupe",
    chapitre: chapitre || undefined,
    district: district || undefined,
    groupe: groupe || undefined,
  };
}

/** Périmètre affiché = rôle + filtres chapitre / district / groupe. */
export function viewOrgScopeFromFilters(
  base: OrgScope,
  filters: { chapitre: string; district: string; groupe: string },
): OrgScope {
  const chapitre = filters.chapitre !== "Tous" ? filters.chapitre : base.chapitre;
  const district = filters.district !== "Tous" ? filters.district : base.district;
  const groupe = filters.groupe !== "Tous" ? filters.groupe : base.groupe;
  const parts = [groupe, district, chapitre].filter(Boolean);
  return {
    chapitre,
    district,
    groupe,
    label: parts.length ? parts.join(" · ") : base.label,
  };
}

/** Nom de l’unité que le responsable pilote (chapitre / district / groupe). */
export function primaryOrgUnitLabel(role: PlatformRole, scope: OrgScope): string {
  if (role === "groupe") return scope.groupe || "Groupe non rattaché";
  if (role === "district") return scope.district || "District non rattaché";
  if (role === "chapitre") return scope.chapitre || "Chapitre non rattaché";
  if (role === "centre") return "Centre Miroir Parfait";
  return "Administration";
}

/** Libellé du type d’unité pilotée. */
export function primaryOrgUnitKind(role: PlatformRole): string {
  if (role === "groupe") return "Groupe";
  if (role === "district") return "District";
  if (role === "chapitre") return "Chapitre";
  if (role === "centre") return "Centre";
  return "Espace";
}

export type MemberListKpis = {
  totalMembres: number;
  abonnesVaguePaix: number;
  zaimuOrdinaire: number;
  zaimuSpecial: number;
  hommes: number;
  femmes: number;
  jeunes: number;
  jeunesFilles: number;
  avenir: number;
  sokahan: number;
  gohonzon: number;
};

export type DateRange = { from: string; to: string };

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day; // lundi
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function resolveDateRange(
  mode: TimeFilterMode,
  options: { year: number; month: number; fromDate: string; toDate: string; now?: Date }
): DateRange {
  const now = options.now ?? new Date();

  if (mode === "annee") {
    return { from: `${options.year}-01-01`, to: `${options.year}-12-31` };
  }

  if (mode === "mois") {
    const first = new Date(options.year, options.month - 1, 1);
    const last = new Date(options.year, options.month, 0);
    return { from: toISODate(first), to: toISODate(last) };
  }

  if (mode === "semaine") {
    const start = startOfWeek(now);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toISODate(start), to: toISODate(end) };
  }

  return {
    from: options.fromDate || `${now.getFullYear()}-01-01`,
    to: options.toDate || toISODate(now),
  };
}

export function inDateRange(dateISO: string, range: DateRange) {
  if (!dateISO) return false;
  return dateISO >= range.from && dateISO <= range.to;
}

export function filterMembersByScope(members: MemberRecord[], scope: OrgScope) {
  return members.filter((m) => {
    if (scope.chapitre && m.chapitre !== scope.chapitre) return false;
    if (scope.district && m.district !== scope.district) return false;
    if (scope.groupe && m.groupe !== scope.groupe) return false;
    return true;
  });
}

export function filterCollectesByScope(records: CollecteLike[], scope: OrgScope) {
  return records.filter((r) => {
    if (scope.chapitre && r.chapitre !== scope.chapitre) return false;
    if (scope.district && r.district !== scope.district) return false;
    if (scope.groupe && r.groupe !== scope.groupe) return false;
    return true;
  });
}

/** Unité de ventilation selon le rôle (les cumuls remontent vers le centre). */
export type StatsBreakdownUnit = "chapitre" | "district" | "groupe";

export function statsBreakdownUnitForRole(role: PlatformRole): StatsBreakdownUnit {
  if (role === "chapitre") return "district";
  if (role === "district" || role === "groupe") return "groupe";
  return "chapitre";
}

export function statsBreakdownLabel(unit: StatsBreakdownUnit): string {
  if (unit === "district") return "District";
  if (unit === "groupe") return "Groupe";
  return "Chapitre";
}

export type StatsBreakdownRow = {
  key: string;
  label: string;
  membres: number;
  cotisations: number;
  zaimuOrdinaire: number;
  zaimuSpecial: number;
  abonnementsVp: number;
  gohonzon: number;
};

export function buildStatsBreakdown(
  members: MemberRecord[],
  collectes: CollecteLike[],
  unit: StatsBreakdownUnit,
): StatsBreakdownRow[] {
  const map = new Map<string, StatsBreakdownRow>();

  const unitKey = (item: { chapitre?: string; district?: string; groupe?: string }) => {
    if (unit === "groupe") return item.groupe || "Non renseigné";
    if (unit === "district") return item.district || "Non renseigné";
    return item.chapitre || "Non renseigné";
  };

  for (const member of members) {
    const key = unitKey(member);
    const row = map.get(key) || {
      key,
      label: key,
      membres: 0,
      cotisations: 0,
      zaimuOrdinaire: 0,
      zaimuSpecial: 0,
      abonnementsVp: 0,
      gohonzon: 0,
    };
    row.membres += 1;
    if (member.abonnementVaguePaix) row.abonnementsVp += 1;
    if (member.gohonzon) row.gohonzon += 1;
    map.set(key, row);
  }

  for (const collecte of collectes) {
    if (collecte.statut !== "Validé") continue;
    const key = unitKey(collecte);
    const row = map.get(key) || {
      key,
      label: key,
      membres: 0,
      cotisations: 0,
      zaimuOrdinaire: 0,
      zaimuSpecial: 0,
      abonnementsVp: 0,
      gohonzon: 0,
    };
    if (collecte.type === "vague-paix") row.cotisations += collecte.montant;
    else if (collecte.type === "zaimu-ordinaire") row.zaimuOrdinaire += collecte.montant;
    else if (collecte.type === "zaimu-special") row.zaimuSpecial += collecte.montant;
    map.set(key, row);
  }

  return [...map.values()].sort((a, b) => b.membres - a.membres || a.label.localeCompare(b.label, "fr"));
}

export function computeMemberListKpis(
  members: MemberRecord[],
  collectes: CollecteLike[],
  range: DateRange
): MemberListKpis {
  // Effectifs : membres présents à la fin de la période (adhésion <= date de fin)
  const membersInPeriod = members.filter((m) => !!m.adhesion && m.adhesion <= range.to);
  const collectesInPeriod = collectes.filter(
    (c) => c.statut === "Validé" && inDateRange(c.date, range)
  );

  const countCat = (label: string) =>
    membersInPeriod.filter((m) => m.categorie.toLowerCase() === label.toLowerCase()).length;

  return {
    totalMembres: membersInPeriod.length,
    abonnesVaguePaix: membersInPeriod.filter((m) => m.abonnementVaguePaix).length,
    zaimuOrdinaire: collectesInPeriod
      .filter((c) => c.type === "zaimu-ordinaire")
      .reduce((sum, c) => sum + c.montant, 0),
    zaimuSpecial: collectesInPeriod
      .filter((c) => c.type === "zaimu-special")
      .reduce((sum, c) => sum + c.montant, 0),
    hommes: countCat("Homme"),
    femmes: countCat("Femme"),
    jeunes: countCat("Jeune homme"),
    jeunesFilles: countCat("Jeune fille"),
    avenir: countCat("Avenir"),
    sokahan: membersInPeriod.filter((m) => m.sokahan).length,
    gohonzon: membersInPeriod.filter((m) => m.gohonzon).length,
  };
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}
