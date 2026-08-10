import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildMemberPdfSummaryCards,
  createMembersFromImport,
  MEMBER_IMPORT_COLUMNS,
  parseMembersImportWorkbook,
} from "./memberImportExport";
import type { MemberRecord } from "./memberFormUtils";

function sampleMember(partial: Partial<MemberRecord>): MemberRecord {
  return {
    id: 1,
    prenom: "A",
    nom: "B",
    email: "a@b.c",
    telephone: "",
    dateNaissance: "",
    departement: "Homme",
    categorie: "Homme",
    responsabilite: "Membre simple",
    dateDebutPratique: "",
    abonnementVaguePaix: false,
    sokahan: false,
    abonnement: false,
    quartier: "",
    chapitre: "C1",
    district: "D1",
    groupe: "G1",
    statut: "Actif",
    adhesion: "",
    totalDons: 0,
    ...partial,
  };
}

describe("memberImportExport", () => {
  it("parses a workbook that follows the template columns", () => {
    const sheet = XLSX.utils.json_to_sheet(
      [
        {
          Prenom: "Awa",
          Nom: "Traoré",
          Email: "awa@example.com",
          Telephone: "+225",
          DateNaissance: "1995-01-01",
          Departement: "Culture",
          Categorie: "Femme",
          Responsabilite: "Membre simple",
          DateDebutPratique: "2019-01-01",
          VagueDePaix: "Oui",
          Sokahan: "Non",
          Quartier: "Cocody",
          Chapitre: "Trois Trésors",
          District: "District Trésors",
          Groupe: "ROI LION",
          Statut: "Actif",
          Abonnement: "Oui",
          DateAdhesion: "2026-01-10",
        },
      ],
      { header: [...MEMBER_IMPORT_COLUMNS] }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Membres");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const parsed = parseMembersImportWorkbook(buffer);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.members).toHaveLength(1);
    expect(parsed.members[0].prenom).toBe("Awa");
    expect(parsed.members[0].abonnementVaguePaix).toBe(true);
    expect(parsed.members[0].sokahan).toBe(false);

    const created = createMembersFromImport(parsed.members, [{ id: 7 } as any]);
    expect(created[0].id).toBe(8);
    expect(created[0].email).toBe("awa@example.com");
  });

  it("builds PDF summary cards from selected export fields only", () => {
    const members = [
      sampleMember({
        id: 1,
        abonnementVaguePaix: true,
        sokahan: true,
        responsabilite: "Membre simple",
      }),
      sampleMember({
        id: 2,
        abonnementVaguePaix: false,
        sokahan: false,
        responsabilite: "Responsable groupe",
        statut: "Actif",
      }),
    ];

    const withVp = buildMemberPdfSummaryCards(members, ["Prenom", "Nom", "VagueDePaix"]);
    expect(withVp.cards.map((c) => c.label)).toEqual(["Effectif", "Abonnés VP"]);
    expect(withVp.cards.find((c) => c.label === "Abonnés VP")?.value).toBe("1");

    const withZaimu = buildMemberPdfSummaryCards(
      members,
      ["Prenom", "Nom", "ZaimuOrd", "ZaimuSp"],
      { collectes: [], zsAssigneById: {}, zsPerimeterCota: 150000 },
    );
    expect(withZaimu.cards.map((c) => c.label)).toEqual([
      "Effectif",
      "Zaimu sp. payé",
      "Zaimu sp. reste",
      "Zaimu ordinaire",
    ]);
    expect(withZaimu.cards.find((c) => c.label === "Zaimu sp. reste")?.value).toBe("150 000");
    expect(withZaimu.cards.find((c) => c.label === "Zaimu sp. reste")?.hint).toContain("cota périmètre 150 000");
    expect(withZaimu.detailLines[0]).toContain("Point consolidé");
    expect(withZaimu.detailLines[0]).toContain("Zaimu spécial");
    expect(withZaimu.detailLines[0]).toContain("Zaimu ordinaire");

    const withRoles = buildMemberPdfSummaryCards(members, [
      "Prenom",
      "Responsabilite",
      "Sokahan",
    ]);
    expect(withRoles.cards.map((c) => c.label)).toContain("Sokahan");
    expect(withRoles.cards.map((c) => c.label)).toContain("Membres simples");
    expect(withRoles.cards.map((c) => c.label)).toContain("Responsables");
    expect(withRoles.detailLines[0]).toContain("Responsable groupe");
  });
});
