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
    expect(MODULE_ACCESS.groupe).toContain("settings");
  });
});
