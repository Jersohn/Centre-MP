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
        quartier: "",
        chapitre: "Chapitre 1 – Kinshasa",
        district: "District Nord",
        groupe: "Groupe A",
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
    expect(member.photo).toBe("data:image/png;base64,abc");
    expect(member.totalDons).toBe(0);
  });
});
