import { describe, expect, it } from "vitest";
import { buildQuotaView, ZAIMU_SPECIAL_CAMPAIGN } from "./zaimuQuota";

const payments = [
  {
    type: "zaimu-special",
    membre: "Jean-Pierre Kabongo Mwamba",
    montant: 100000,
    statut: "Validé",
    chapitre: "Chapitre 1 – Kinshasa",
    district: "District Nord",
    groupe: "Groupe A",
  },
  {
    type: "zaimu-ordinaire",
    membre: "Marie-Claire Tshisekedi Wa",
    montant: 25000,
    statut: "Validé",
    chapitre: "Chapitre 1 – Kinshasa",
    district: "District Nord",
    groupe: "Groupe A",
  },
];

describe("zaimuQuota", () => {
  it("aggregates centre quota with paid and remaining", () => {
    const view = buildQuotaView("centre", ZAIMU_SPECIAL_CAMPAIGN, payments);
    expect(view.headline.assigne).toBe(10_000_000);
    expect(view.headline.paye).toBe(100000);
    expect(view.headline.reste).toBe(9_900_000);
    expect(view.children.length).toBe(4);
    expect(view.childLabel).toBe("Chapitre");
  });

  it("shows member breakdown for groupe role", () => {
    const view = buildQuotaView("groupe", ZAIMU_SPECIAL_CAMPAIGN, payments);
    expect(view.childLabel).toBe("Membre");
    expect(view.headline.assigne).toBe(2_200_000);
    expect(view.zaimuOrdinairePaye).toBe(25000);
    expect(view.children.some((c) => c.paye === 100000)).toBe(true);
  });
});
