import { describe, expect, it } from "vitest";
import type { MemberRecord } from "./memberFormUtils";
import {
  buildStatsBreakdown,
  filterCollectesByScope,
  filterMembersByScope,
  type CollecteLike,
  type OrgScope,
} from "./memberListStats";

function member(partial: Partial<MemberRecord> & Pick<MemberRecord, "id" | "chapitre" | "district" | "groupe">): MemberRecord {
  return {
    prenom: "A",
    nom: "B",
    email: `${partial.id}@sgi.org`,
    telephone: "",
    dateNaissance: "",
    departement: "",
    categorie: "Homme",
    responsabilite: "Membre simple",
    dateDebutPratique: "",
    abonnementVaguePaix: false,
    sokahan: false,
    gohonzon: false,
    quartier: "",
    statut: "Actif",
    abonnement: false,
    adhesion: "2026-01-01",
    photo: "",
    totalDons: 0,
    ...partial,
  };
}

describe("stats rollup consistency", () => {
  const members: MemberRecord[] = [
    member({ id: 1, chapitre: "C1", district: "D1", groupe: "G1", abonnementVaguePaix: true, gohonzon: true }),
    member({ id: 2, chapitre: "C1", district: "D1", groupe: "G2" }),
    member({ id: 3, chapitre: "C1", district: "D2", groupe: "G3", abonnementVaguePaix: true, gohonzon: true }),
    member({ id: 4, chapitre: "C2", district: "D3", groupe: "G4" }),
  ];

  const collectes: CollecteLike[] = [
    { type: "vague-paix", montant: 1000, date: "2026-02-01", statut: "Validé", chapitre: "C1", district: "D1", groupe: "G1" },
    { type: "zaimu-ordinaire", montant: 500, date: "2026-02-02", statut: "Validé", chapitre: "C1", district: "D1", groupe: "G2" },
    { type: "vague-paix", montant: 800, date: "2026-02-03", statut: "Validé", chapitre: "C1", district: "D2", groupe: "G3" },
    { type: "zaimu-special", montant: 200, date: "2026-02-04", statut: "Validé", chapitre: "C2", district: "D3", groupe: "G4" },
  ];

  it("sums groupe rows into district, then chapitre, then centre", () => {
    const centre = buildStatsBreakdown(members, collectes, "chapitre");
    const chapitreC1 = buildStatsBreakdown(
      filterMembersByScope(members, { label: "C1", chapitre: "C1" }),
      filterCollectesByScope(collectes, { label: "C1", chapitre: "C1" }),
      "district",
    );
    const districtD1Scope: OrgScope = { label: "D1", chapitre: "C1", district: "D1" };
    const districtD1 = buildStatsBreakdown(
      filterMembersByScope(members, districtD1Scope),
      filterCollectesByScope(collectes, districtD1Scope),
      "groupe",
    );

    expect(districtD1.reduce((s, r) => s + r.gohonzon, 0)).toBe(1);
    expect(districtD1.reduce((s, r) => s + r.membres, 0)).toBe(2);
    expect(districtD1.reduce((s, r) => s + r.cotisations, 0)).toBe(1000);
    expect(districtD1.reduce((s, r) => s + r.zaimuOrdinaire, 0)).toBe(500);
    expect(districtD1.reduce((s, r) => s + r.zaimuSpecial, 0)).toBe(0);

    expect(chapitreC1.reduce((s, r) => s + r.membres, 0)).toBe(3);
    expect(chapitreC1.reduce((s, r) => s + r.cotisations, 0)).toBe(1800);
    expect(chapitreC1.reduce((s, r) => s + r.zaimuOrdinaire, 0)).toBe(500);
    expect(chapitreC1.reduce((s, r) => s + r.zaimuSpecial, 0)).toBe(0);

    expect(centre.reduce((s, r) => s + r.membres, 0)).toBe(4);
    expect(centre.reduce((s, r) => s + r.cotisations, 0)).toBe(1800);
    expect(centre.reduce((s, r) => s + r.zaimuOrdinaire, 0)).toBe(500);
    expect(centre.reduce((s, r) => s + r.zaimuSpecial, 0)).toBe(200);

    // Remontée : somme des districts du chapitre = ligne chapitre au centre
    const c1Centre = centre.find((r) => r.key === "C1");
    expect(c1Centre?.membres).toBe(chapitreC1.reduce((s, r) => s + r.membres, 0));
    expect(c1Centre?.cotisations).toBe(chapitreC1.reduce((s, r) => s + r.cotisations, 0));
    expect(c1Centre?.zaimuOrdinaire).toBe(chapitreC1.reduce((s, r) => s + r.zaimuOrdinaire, 0));
    expect(c1Centre?.zaimuSpecial).toBe(chapitreC1.reduce((s, r) => s + r.zaimuSpecial, 0));
    expect(c1Centre?.gohonzon).toBe(chapitreC1.reduce((s, r) => s + r.gohonzon, 0));
    expect(c1Centre?.gohonzon).toBe(2);
  });
});
