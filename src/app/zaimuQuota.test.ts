import { describe, expect, it } from "vitest";
import type { MemberRecord } from "./memberFormUtils";
import { memberFullName } from "./membersData";
import { DEMO_ORG_SCOPE } from "./memberListStats";
import { ORG_HIERARCHY } from "./orgHierarchy";
import { buildQuotaView, buildZaimuSpecialCampaign } from "./zaimuQuota";

const demoMember: MemberRecord = {
  id: 1,
  prenom: "Demo",
  nom: "Membre",
  email: "demo.membre@centre-mp.ci",
  telephone: "+225 07 00 00 00 00",
  dateNaissance: "1990-01-15",
  departement: "Groupe",
  categorie: "Homme",
  responsabilite: "Responsable groupe",
  dateDebutPratique: "2015-03-01",
  abonnementVaguePaix: true,
  sokahan: false,
  quartier: "Cocody",
  chapitre: DEMO_ORG_SCOPE.groupe.chapitre!,
  district: DEMO_ORG_SCOPE.groupe.district!,
  groupe: DEMO_ORG_SCOPE.groupe.groupe!,
  statut: "Actif",
  adhesion: "2025-01-10",
  abonnement: true,
  photo: "",
  totalDons: 0,
};

const campaign = buildZaimuSpecialCampaign([demoMember]);

const payments = [
  {
    type: "zaimu-special",
    membre: memberFullName(demoMember),
    montant: 100000,
    statut: "Validé",
    chapitre: demoMember.chapitre,
    district: demoMember.district,
    groupe: demoMember.groupe,
  },
  {
    type: "zaimu-ordinaire",
    membre: memberFullName(demoMember),
    montant: 25000,
    statut: "Validé",
    chapitre: demoMember.chapitre,
    district: demoMember.district,
    groupe: demoMember.groupe,
  },
];

describe("zaimuQuota", () => {
  it("aggregates centre quota with paid and remaining", () => {
    const view = buildQuotaView("centre", campaign, payments);
    expect(view.headline.assigne).toBe(10_000_000);
    expect(view.headline.paye).toBe(100000);
    expect(view.headline.reste).toBe(9_900_000);
    expect(view.children.length).toBe(ORG_HIERARCHY.length);
    expect(view.childLabel).toBe("Chapitre");
  });

  it("shows group children for district role", () => {
    const view = buildQuotaView("district", campaign, payments);
    expect(view.childLabel).toBe("Groupe");
    expect(view.children.length).toBe(3); // District Bodhisattva
    expect(view.children.map((child) => child.label)).toEqual([
      "BODDHISATTVA",
      "BONTEN",
      "PREUVE ACTUELLE (RISHO ANKOKURON)",
    ]);
  });

  it("shows member breakdown for groupe role", () => {
    const view = buildQuotaView("groupe", campaign, payments);
    expect(view.childLabel).toBe("Membre");
    expect(view.zaimuOrdinairePaye).toBe(25000);
    expect(view.children.some((c) => c.paye === 100000)).toBe(true);
  });
});
