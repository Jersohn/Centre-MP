import { describe, expect, it } from "vitest";
import {
  canChangeMemberResponsabilite,
  canDeactivateMember,
  canDeleteUser,
  canManageUserAccount,
  isProtectedHierarchyTarget,
  platformRoleFromResponsabilite,
} from "./orgAccess";

describe("orgAccess hierarchy protection", () => {
  it("maps member responsabilite to platform roles", () => {
    expect(platformRoleFromResponsabilite("Responsable centre")).toBe("centre");
    expect(platformRoleFromResponsabilite("Responsable chapitre")).toBe("chapitre");
    expect(platformRoleFromResponsabilite("Membre simple")).toBeNull();
  });

  it("protects hierarchical superiors and peers", () => {
    expect(isProtectedHierarchyTarget("chapitre", "centre")).toBe(true);
    expect(isProtectedHierarchyTarget("chapitre", "chapitre")).toBe(true);
    expect(isProtectedHierarchyTarget("chapitre", "district")).toBe(false);
    expect(isProtectedHierarchyTarget("district", "groupe")).toBe(false);
    expect(isProtectedHierarchyTarget("admin", "centre")).toBe(false);
  });

  it("blocks account edits on superiors for chapitre", () => {
    expect(canManageUserAccount("chapitre", "centre", false)).toBe(false);
    expect(canManageUserAccount("chapitre", "district", false)).toBe(true);
    expect(canManageUserAccount("chapitre", "groupe", false)).toBe(true);
    expect(canDeleteUser("chapitre", "district", false)).toBe(false);
  });

  it("blocks member deactivation / responsibility change on superiors", () => {
    expect(canDeactivateMember("chapitre", "Responsable centre")).toBe(false);
    expect(canDeactivateMember("chapitre", "Membre simple")).toBe(true);
    expect(canChangeMemberResponsabilite("groupe", "Responsable district")).toBe(false);
    expect(canChangeMemberResponsabilite("chapitre", "Membre simple")).toBe(true);
  });
});
