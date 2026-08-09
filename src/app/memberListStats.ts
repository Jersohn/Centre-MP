import type { MemberRecord } from "./memberFormUtils";
import type { PlatformRole } from "./roles";
import { defaultChapitre, defaultDistrict, defaultGroupe } from "./orgHierarchy";

export type CollecteLike = {
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

/** Périmètre démo par profil (en attendant le rattachement réel des comptes). */
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
  };
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}
