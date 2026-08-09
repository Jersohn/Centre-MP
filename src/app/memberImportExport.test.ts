import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  createMembersFromImport,
  MEMBER_IMPORT_COLUMNS,
  parseMembersImportWorkbook,
} from "./memberImportExport";

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
});
