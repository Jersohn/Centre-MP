import { describe, expect, it } from "vitest";
import { ALLOWED_ROLES, MODULE_ACCESS, ROLE_LABELS } from "./roles";

describe("platform roles", () => {
  it("exposes only the expected actor roles for the platform", () => {
    expect(ALLOWED_ROLES).toEqual(["admin", "centre", "chapitre", "district", "groupe"]);
    expect(ROLE_LABELS.admin).toBe("Administrateur");
    expect(ROLE_LABELS.centre).toBe("Responsable centre");
    expect(ROLE_LABELS.chapitre).toBe("Responsable chapitre");
    expect(ROLE_LABELS.district).toBe("Responsable district");
    expect(ROLE_LABELS.groupe).toBe("Responsable groupe");
    expect(MODULE_ACCESS.chapitre).toContain("statistiques");
    expect(MODULE_ACCESS.district).toContain("statistiques");
    expect(MODULE_ACCESS.groupe).toContain("statistiques");
    expect(MODULE_ACCESS.centre).toEqual(MODULE_ACCESS.admin);
    expect(MODULE_ACCESS.centre).toContain("statistiques");
    expect(MODULE_ACCESS.centre).toContain("contenu");
    expect(MODULE_ACCESS.centre).toContain("settings");
    expect(MODULE_ACCESS.centre).toContain("chapitres");
    expect(MODULE_ACCESS.centre).toContain("districts");
    expect(MODULE_ACCESS.centre).toContain("groupes");
    expect(MODULE_ACCESS.admin).toContain("settings");
    expect(MODULE_ACCESS.admin).toContain("groupes");
    expect(MODULE_ACCESS.chapitre).not.toContain("groupes");
    expect(MODULE_ACCESS.chapitre).toContain("collectes");
    expect(MODULE_ACCESS.district).toContain("collectes");
    expect(MODULE_ACCESS.groupe).toContain("collectes");
    expect(MODULE_ACCESS.chapitre).toContain("profil");
    expect(MODULE_ACCESS.groupe).toContain("profil");
    expect(MODULE_ACCESS.chapitre).toContain("settings");
    expect(MODULE_ACCESS.district).not.toContain("settings");
    expect(MODULE_ACCESS.groupe).not.toContain("settings");
    expect(MODULE_ACCESS.admin).not.toContain("directives");
    expect(MODULE_ACCESS.chapitre).not.toContain("directives");
  });
});
