import { describe, expect, it } from "vitest";
import {
  MEMBER_RESPONSABILITES,
  displayResponsabilite,
  platformRoleFromResponsabiliteLabel,
  responsabilitesForAssignableRoles,
  suggestedResponsabiliteForPromotion,
  toDbResponsabilite,
} from "./responsabilites";

describe("responsabilites", () => {
  it("exposes membre simple plus 6 rôles for each of 4 levels", () => {
    expect(MEMBER_RESPONSABILITES).toContain("Membre simple");
    expect(MEMBER_RESPONSABILITES).toContain("Responsable centre");
    expect(MEMBER_RESPONSABILITES).toContain("Responsable femme chapitre");
    expect(MEMBER_RESPONSABILITES).toContain("Responsable jeunesse district");
    expect(MEMBER_RESPONSABILITES).toContain("Responsable jeune homme groupe");
    expect(MEMBER_RESPONSABILITES).toContain("Responsable jeune fille centre");
    expect(MEMBER_RESPONSABILITES).toHaveLength(25);
  });

  it("maps labels and db slugs in both directions", () => {
    expect(toDbResponsabilite("Responsable femme chapitre")).toBe("responsable_femme_chapitre");
    expect(displayResponsabilite("responsable_jeune_fille_groupe")).toBe(
      "Responsable jeune fille groupe",
    );
    expect(displayResponsabilite("Membre")).toBe("Membre simple");
    expect(toDbResponsabilite("")).toBe("membre_simple");
  });

  it("maps division titles to the org platform role", () => {
    expect(platformRoleFromResponsabiliteLabel("Responsable homme centre")).toBe("centre");
    expect(platformRoleFromResponsabiliteLabel("Responsable jeune fille district")).toBe("district");
    expect(platformRoleFromResponsabiliteLabel("Membre simple")).toBeNull();
  });

  it("lists assignable division titles for a platform actor", () => {
    const chapitre = responsabilitesForAssignableRoles(["chapitre", "district", "groupe"]);
    expect(chapitre).toContain("Responsable femme district");
    expect(chapitre).toContain("Responsable jeune homme groupe");
    expect(chapitre).not.toContain("Responsable centre");
    expect(chapitre).not.toContain("Membre simple");
    expect(chapitre).toHaveLength(18);
  });

  it("suggests the current title when it is assignable", () => {
    const allowed = responsabilitesForAssignableRoles(["groupe"]);
    expect(suggestedResponsabiliteForPromotion("Responsable femme groupe", allowed, "groupe")).toBe(
      "Responsable femme groupe",
    );
    expect(suggestedResponsabiliteForPromotion("Membre simple", allowed, "groupe")).toBe(
      "Responsable groupe",
    );
  });
});
