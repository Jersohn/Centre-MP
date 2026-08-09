import { beforeEach, describe, expect, it } from "vitest";
import {
  accessToMatrix,
  defaultModuleAccess,
  loadModuleAccess,
  matrixToAccess,
  RBAC_STORAGE_KEY,
  resetModuleAccess,
  saveModuleAccess,
} from "./rbacStore";

function installMemoryStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage: storage,
      dispatchEvent: () => true,
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}

describe("rbacStore", () => {
  beforeEach(() => {
    installMemoryStorage();
    window.localStorage.removeItem(RBAC_STORAGE_KEY);
  });

  it("loads default access aligned with platform roles", () => {
    const access = loadModuleAccess();
    expect(access.admin).toContain("settings");
    expect(access.centre).toContain("settings");
    expect(access.chapitre).toContain("settings");
    expect(access.district).not.toContain("settings");
    expect(access.groupe).not.toContain("settings");
    expect(access.centre).toContain("statistiques");
    expect(access.groupe).toContain("statistiques");
    expect(access.groupe).toContain("profil");
  });

  it("persists toggles and keeps settings for admin/centre/chapitre", () => {
    const matrix = accessToMatrix(defaultModuleAccess()).map((row) =>
      row.moduleKey === "statistiques"
        ? { ...row, roles: { ...row.roles, groupe: false } }
        : row.moduleKey === "settings"
          ? {
              ...row,
              roles: {
                ...row.roles,
                admin: false,
                centre: false,
                chapitre: false,
                district: true,
              },
            }
          : row,
    );
    const saved = saveModuleAccess(matrixToAccess(matrix));
    expect(saved.groupe).not.toContain("statistiques");
    expect(saved.admin).toContain("settings");
    expect(saved.centre).toContain("settings");
    expect(saved.chapitre).toContain("settings");
    expect(saved.district).not.toContain("settings");
    expect(loadModuleAccess().groupe).not.toContain("statistiques");
  });

  it("resets to defaults", () => {
    saveModuleAccess({
      ...defaultModuleAccess(),
      groupe: ["dashboard", "profil"],
    });
    const reset = resetModuleAccess();
    expect(reset.groupe).toContain("membres");
    expect(reset.groupe).toContain("collectes");
  });
});
