import { memberFullName, MEMBERS_SEED } from "./membersData";
import type { MemberRecord } from "./memberFormUtils";
import type { PlatformRole } from "./roles";
import type { OrgScope } from "./memberListStats";
import { DEMO_ORG_SCOPE } from "./memberListStats";

export type CollectePayment = {
  type: string;
  membre: string;
  montant: number;
  statut: string;
  chapitre: string;
  district: string;
  groupe: string;
};

export type MemberQuotaNode = {
  memberId: number;
  membre: string;
  assigne: number;
};

export type GroupeQuotaNode = {
  groupe: string;
  assigne: number;
  membres: MemberQuotaNode[];
};

export type DistrictQuotaNode = {
  district: string;
  assigne: number;
  groupes: GroupeQuotaNode[];
};

export type ChapitreQuotaNode = {
  chapitre: string;
  assigne: number;
  districts: DistrictQuotaNode[];
};

export type ZaimuSpecialCampaign = {
  id: string;
  label: string;
  annee: number;
  montantCentre: number;
  chapitres: ChapitreQuotaNode[];
};

export type QuotaBalance = {
  key: string;
  label: string;
  assigne: number;
  paye: number;
  reste: number;
  progress: number;
};

function byName(id: number) {
  const m = MEMBERS_SEED.find((x) => x.id === id);
  return m ? memberFullName(m) : `Membre #${id}`;
}

/** Campagne démo : cota centre → chapitres → districts → groupes → membres */
export const ZAIMU_SPECIAL_CAMPAIGN: ZaimuSpecialCampaign = {
  id: "ZS-CAMP-2026",
  label: "Campagne Zaimu spécial 2026",
  annee: 2026,
  montantCentre: 10_000_000,
  chapitres: [
    {
      chapitre: "Chapitre 1 – Kinshasa",
      assigne: 4_000_000,
      districts: [
        {
          district: "District Nord",
          assigne: 2_200_000,
          groupes: [
            {
              groupe: "Groupe A",
              assigne: 2_200_000,
              membres: [
                { memberId: 1, membre: byName(1), assigne: 1_200_000 },
                { memberId: 5, membre: byName(5), assigne: 1_000_000 },
              ],
            },
          ],
        },
        {
          district: "District Sud",
          assigne: 1_800_000,
          groupes: [
            {
              groupe: "Groupe C",
              assigne: 1_800_000,
              membres: [{ memberId: 7, membre: byName(7), assigne: 1_800_000 }],
            },
          ],
        },
      ],
    },
    {
      chapitre: "Chapitre 2 – Brazzaville",
      assigne: 2_500_000,
      districts: [
        {
          district: "District Sud",
          assigne: 1_200_000,
          groupes: [
            {
              groupe: "Groupe B",
              assigne: 1_200_000,
              membres: [{ memberId: 2, membre: byName(2), assigne: 1_200_000 }],
            },
          ],
        },
        {
          district: "District Est",
          assigne: 1_300_000,
          groupes: [
            {
              groupe: "Groupe A",
              assigne: 1_300_000,
              membres: [{ memberId: 9, membre: byName(9), assigne: 1_300_000 }],
            },
          ],
        },
      ],
    },
    {
      chapitre: "Chapitre 3 – Paris",
      assigne: 2_000_000,
      districts: [
        {
          district: "District Ouest",
          assigne: 1_200_000,
          groupes: [
            {
              groupe: "Groupe C",
              assigne: 600_000,
              membres: [{ memberId: 3, membre: byName(3), assigne: 600_000 }],
            },
            {
              groupe: "Groupe D",
              assigne: 600_000,
              membres: [{ memberId: 8, membre: byName(8), assigne: 600_000 }],
            },
          ],
        },
        {
          district: "District Nord",
          assigne: 800_000,
          groupes: [
            {
              groupe: "Groupe B",
              assigne: 800_000,
              membres: [{ memberId: 10, membre: byName(10), assigne: 800_000 }],
            },
          ],
        },
      ],
    },
    {
      chapitre: "Chapitre 4 – Abidjan",
      assigne: 1_500_000,
      districts: [
        {
          district: "District Nord",
          assigne: 700_000,
          groupes: [
            {
              groupe: "Groupe B",
              assigne: 700_000,
              membres: [{ memberId: 6, membre: byName(6), assigne: 700_000 }],
            },
          ],
        },
        {
          district: "District Est",
          assigne: 800_000,
          groupes: [
            {
              groupe: "Groupe D",
              assigne: 800_000,
              membres: [{ memberId: 4, membre: byName(4), assigne: 800_000 }],
            },
          ],
        },
      ],
    },
  ],
};

export function formatCdf(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function progressOf(assigne: number, paye: number) {
  if (assigne <= 0) return paye > 0 ? 100 : 0;
  return Math.min(100, Math.round((paye / assigne) * 100));
}

function balance(key: string, label: string, assigne: number, paye: number): QuotaBalance {
  const reste = Math.max(0, assigne - paye);
  return { key, label, assigne, paye, reste, progress: progressOf(assigne, paye) };
}

function paidForMember(collectes: CollectePayment[], membre: string) {
  return collectes
    .filter(
      (c) =>
        c.type === "zaimu-special" &&
        c.statut === "Validé" &&
        c.membre.trim().toLowerCase() === membre.trim().toLowerCase()
    )
    .reduce((sum, c) => sum + c.montant, 0);
}

function paidInScope(collectes: CollectePayment[], scope: OrgScope) {
  return collectes
    .filter((c) => {
      if (c.type !== "zaimu-special" || c.statut !== "Validé") return false;
      if (scope.chapitre && c.chapitre !== scope.chapitre) return false;
      if (scope.district && c.district !== scope.district) return false;
      if (scope.groupe && c.groupe !== scope.groupe) return false;
      return true;
    })
    .reduce((sum, c) => sum + c.montant, 0);
}

function paidOrdinaireInScope(collectes: CollectePayment[], scope: OrgScope) {
  return collectes
    .filter((c) => {
      if (c.type !== "zaimu-ordinaire" || c.statut !== "Validé") return false;
      if (scope.chapitre && c.chapitre !== scope.chapitre) return false;
      if (scope.district && c.district !== scope.district) return false;
      if (scope.groupe && c.groupe !== scope.groupe) return false;
      return true;
    })
    .reduce((sum, c) => sum + c.montant, 0);
}

export function getMemberSpecialAssignment(
  campaign: ZaimuSpecialCampaign,
  member: Pick<MemberRecord, "id" | "prenom" | "nom" | "chapitre" | "district" | "groupe">
) {
  let assigne = 0;
  for (const ch of campaign.chapitres) {
    if (ch.chapitre !== member.chapitre) continue;
    for (const d of ch.districts) {
      if (d.district !== member.district) continue;
      for (const g of d.groupes) {
        if (g.groupe !== member.groupe) continue;
        for (const m of g.membres) {
          if (m.memberId === member.id) assigne += m.assigne;
        }
      }
    }
  }
  return assigne;
}

export function getMemberZaimuPaid(
  collectes: CollectePayment[],
  member: Pick<MemberRecord, "prenom" | "nom">,
  type: "zaimu-ordinaire" | "zaimu-special"
) {
  const name = memberFullName(member);
  return collectes
    .filter(
      (c) =>
        c.type === type &&
        c.statut === "Validé" &&
        c.membre.trim().toLowerCase() === name.trim().toLowerCase()
    )
    .reduce((sum, c) => sum + c.montant, 0);
}

/** Nœuds enfants à afficher selon le profil (répartition + payé / reste). */
export function buildQuotaView(
  role: PlatformRole,
  campaign: ZaimuSpecialCampaign,
  collectes: CollectePayment[],
  scope: OrgScope = DEMO_ORG_SCOPE[role]
): {
  title: string;
  subtitle: string;
  headline: QuotaBalance;
  zaimuOrdinairePaye: number;
  children: QuotaBalance[];
  childLabel: string;
} {
  const ordinairePaye = paidOrdinaireInScope(collectes, scope);

  if (role === "groupe") {
    const chapitre = campaign.chapitres.find((c) => c.chapitre === scope.chapitre);
    const district = chapitre?.districts.find((d) => d.district === scope.district);
    const groupe = district?.groupes.find((g) => g.groupe === scope.groupe);
    const assigne = groupe?.assigne ?? 0;
    const paye = paidInScope(collectes, scope);
    const children = (groupe?.membres ?? [])
      .filter((m) => m.assigne > 0)
      .map((m) => balance(String(m.memberId), m.membre, m.assigne, paidForMember(collectes, m.membre)));
    return {
      title: "Cota Zaimu spécial — Groupe",
      subtitle: scope.label,
      headline: balance("groupe", scope.groupe || "Groupe", assigne, paye),
      zaimuOrdinairePaye: ordinairePaye,
      children,
      childLabel: "Membre",
    };
  }

  if (role === "district") {
    const chapitre = campaign.chapitres.find((c) => c.chapitre === scope.chapitre);
    const district = chapitre?.districts.find((d) => d.district === scope.district);
    const assigne = district?.assigne ?? 0;
    const paye = paidInScope(collectes, scope);
    const children = (district?.groupes ?? []).map((g) =>
      balance(
        g.groupe,
        g.groupe,
        g.assigne,
        paidInScope(collectes, { ...scope, groupe: g.groupe })
      )
    );
    return {
      title: "Cota Zaimu spécial — District",
      subtitle: scope.label,
      headline: balance("district", scope.district || "District", assigne, paye),
      zaimuOrdinairePaye: ordinairePaye,
      children,
      childLabel: "Groupe",
    };
  }

  if (role === "chapitre") {
    const chapitre = campaign.chapitres.find((c) => c.chapitre === scope.chapitre);
    const assigne = chapitre?.assigne ?? 0;
    const paye = paidInScope(collectes, scope);
    const children = (chapitre?.districts ?? []).map((d) =>
      balance(
        d.district,
        d.district,
        d.assigne,
        paidInScope(collectes, { ...scope, district: d.district })
      )
    );
    return {
      title: "Cota Zaimu spécial — Chapitre",
      subtitle: scope.label,
      headline: balance("chapitre", scope.chapitre || "Chapitre", assigne, paye),
      zaimuOrdinairePaye: ordinairePaye,
      children,
      childLabel: "District",
    };
  }

  // centre / admin
  const paye = paidInScope(collectes, {});
  const children = campaign.chapitres.map((c) =>
    balance(c.chapitre, c.chapitre, c.assigne, paidInScope(collectes, { label: c.chapitre, chapitre: c.chapitre }))
  );
  return {
    title: "Cota Zaimu spécial — Centre",
    subtitle: `${campaign.label} · répartition nationale`,
    headline: balance("centre", "Centre", campaign.montantCentre, paye),
    zaimuOrdinairePaye: ordinairePaye,
    children,
    childLabel: "Chapitre",
  };
}
