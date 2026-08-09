import { describe, expect, it } from "vitest";
import { memberFullName, MEMBERS_SEED } from "./membersData";
import { DEMO_ORG_SCOPE } from "./memberListStats";
import { ORG_HIERARCHY } from "./orgHierarchy";
import { buildQuotaView, ZAIMU_SPECIAL_CAMPAIGN } from "./zaimuQuota";

const demoMember = MEMBERS_SEED.find(
  (member) =>
    member.chapitre === DEMO_ORG_SCOPE.groupe.chapitre &&
    member.district === DEMO_ORG_SCOPE.groupe.district &&
    member.groupe === DEMO_ORG_SCOPE.groupe.groupe,
)!;

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
    const view = buildQuotaView("centre", ZAIMU_SPECIAL_CAMPAIGN, payments);
    expect(view.headline.assigne).toBe(10_000_000);
    expect(view.headline.paye).toBe(100000);
    expect(view.headline.reste).toBe(9_900_000);
    expect(view.children.length).toBe(ORG_HIERARCHY.length);
    expect(view.childLabel).toBe("Chapitre");
  });

  it("shows group children for district role", () => {
    const view = buildQuotaView("district", ZAIMU_SPECIAL_CAMPAIGN, payments);
    expect(view.childLabel).toBe("Groupe");
    expect(view.children.length).toBe(3); // District Bodhisattva
    expect(view.children.map((child) => child.label)).toEqual([
      "BODDHISATTVA",
      "BONTEN",
      "PREUVE ACTUELLE (RISHO ANKOKURON)",
    ]);
  });

  it("shows member breakdown for groupe role", () => {
    const view = buildQuotaView("groupe", ZAIMU_SPECIAL_CAMPAIGN, payments);
    expect(view.childLabel).toBe("Membre");
    expect(view.zaimuOrdinairePaye).toBe(25000);
    expect(view.children.some((c) => c.paye === 100000)).toBe(true);
  });
});
