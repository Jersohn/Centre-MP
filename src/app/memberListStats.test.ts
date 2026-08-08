import { describe, expect, it } from "vitest";
import {
  computeMemberListKpis,
  filterMembersByScope,
  resolveDateRange,
} from "./memberListStats";
import type { MemberRecord } from "./memberFormUtils";

const sampleMembers = [
  {
    id: 1,
    categorie: "Homme",
    abonnementVaguePaix: true,
    sokahan: true,
    adhesion: "2026-03-01",
    chapitre: "Chapitre 1 – Kinshasa",
    district: "District Nord",
    groupe: "Groupe A",
  },
  {
    id: 2,
    categorie: "Jeune fille",
    abonnementVaguePaix: false,
    sokahan: false,
    adhesion: "2026-08-02",
    chapitre: "Chapitre 1 – Kinshasa",
    district: "District Nord",
    groupe: "Groupe B",
  },
  {
    id: 3,
    categorie: "Avenir",
    abonnementVaguePaix: true,
    sokahan: true,
    adhesion: "2026-07-10",
    chapitre: "Chapitre 2 – Brazzaville",
    district: "District Sud",
    groupe: "Groupe A",
  },
] as MemberRecord[];

describe("memberListStats", () => {
  it("scopes members by district for consolidation", () => {
    const scoped = filterMembersByScope(sampleMembers, {
      label: "District Nord",
      chapitre: "Chapitre 1 – Kinshasa",
      district: "District Nord",
    });
    expect(scoped).toHaveLength(2);
  });

  it("computes category and financial KPIs for a period", () => {
    const range = resolveDateRange("mois", {
      year: 2026,
      month: 8,
      fromDate: "",
      toDate: "",
    });
    const kpis = computeMemberListKpis(
      sampleMembers,
      [
        {
          type: "zaimu-ordinaire",
          montant: 25000,
          date: "2026-08-05",
          statut: "Validé",
          chapitre: "Chapitre 1 – Kinshasa",
          district: "District Nord",
          groupe: "Groupe A",
        },
        {
          type: "zaimu-special",
          montant: 100000,
          date: "2026-07-01",
          statut: "Validé",
          chapitre: "Chapitre 1 – Kinshasa",
          district: "District Nord",
          groupe: "Groupe A",
        },
      ],
      range
    );

    expect(kpis.totalMembres).toBe(3);
    expect(kpis.jeunesFilles).toBe(1);
    expect(kpis.avenir).toBe(1);
    expect(kpis.sokahan).toBe(2);
    expect(kpis.zaimuOrdinaire).toBe(25000);
    expect(kpis.zaimuSpecial).toBe(0);
  });
});
