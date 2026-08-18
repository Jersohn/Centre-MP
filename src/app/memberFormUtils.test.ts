import { describe, expect, it } from "vitest";
import { createMemberFromForm } from "./memberFormUtils";

describe("createMemberFromForm", () => {
  it("creates a new member with a generated id and normalized values", () => {
    const existingMembers = [{ id: 1, prenom: "Ada", nom: "Lovelace", email: "ada@example.com" } as any];

    const member = createMemberFromForm(
      {
        prenom: "  Grace  ",
        nom: " Hopper ",
        email: "grace@example.com",
        telephone: "+221 77 000 0000",
        dateNaissance: "",
        departement: "",
        categorie: "Femme",
        responsabilite: "Membre simple",
        dateDebutPratique: "",
        abonnementVaguePaix: false,
        sokahan: true,
        gohonzon: true,
        quartier: "",
        chapitre: "Rissho Ankoku Ron",
        district: "District Bodhisattva",
        groupe: "BODDHISATTVA",
        statut: "Actif",
        abonnement: true,
        photo: "data:image/png;base64,abc",
      },
      existingMembers
    );

    expect(member.id).toBe(2);
    expect(member.prenom).toBe("Grace");
    expect(member.nom).toBe("Hopper");
    expect(member.email).toBe("grace@example.com");
    expect(member.abonnement).toBe(true);
    expect(member.sokahan).toBe(true);
    expect(member.gohonzon).toBe(true);
    expect(member.photo).toBe("data:image/png;base64,abc");
  });

  it("keeps email empty when omitted", () => {
    const member = createMemberFromForm(
      {
        prenom: "Awa",
        nom: "Traoré",
        email: "  ",
        telephone: "",
        dateNaissance: "",
        departement: "Femme",
        categorie: "Femme",
        responsabilite: "Membre simple",
        dateDebutPratique: "",
        abonnementVaguePaix: false,
        sokahan: false,
        gohonzon: false,
        quartier: "",
        chapitre: "",
        district: "",
        groupe: "",
        statut: "Actif",
        abonnement: false,
        photo: "",
      },
      [],
    );

    expect(member.email).toBe("");
  });
    expect(member.totalDons).toBe(0);
  });
});
