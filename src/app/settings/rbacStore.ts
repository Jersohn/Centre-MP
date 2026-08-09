import {
  ALLOWED_ROLES,
  MODULE_ACCESS,
  type ModuleKey,
  type PlatformRole,
} from "../roles";

export const RBAC_STORAGE_KEY = "sgi-rbac-module-access-v4";
export const RBAC_CHANGED_EVENT = "sgi-rbac-changed";

export type RbacMatrixRow = {
  moduleKey: ModuleKey;
  module: string;
  roles: Record<PlatformRole, boolean>;
};

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Tableau de bord",
  membres: "Membres",
  collectes: "Collectes",
  directives: "Directives",
  statistiques: "Statistiques",
  chapitres: "Chapitres",
  districts: "Districts",
  groupes: "Groupes",
  contenu: "Contenu",
  settings: "Paramètres",
  profil: "Profil",
};

/** Modules configurables dans la matrice RBAC (profil toujours accessible). */
export const RBAC_CONFIGURABLE_MODULES: ModuleKey[] = [
  "dashboard",
  "membres",
  "collectes",
  "statistiques",
  "chapitres",
  "districts",
  "groupes",
  "contenu",
  "settings",
];

const ORG_MODULES: ModuleKey[] = ["chapitres", "districts", "groupes"];

export function defaultModuleAccess(): Record<PlatformRole, ModuleKey[]> {
  return {
    admin: [...MODULE_ACCESS.admin],
    centre: [...MODULE_ACCESS.centre],
    chapitre: [...MODULE_ACCESS.chapitre],
    district: [...MODULE_ACCESS.district],
    groupe: [...MODULE_ACCESS.groupe],
  };
}

function sanitizeAccess(
  raw: Partial<Record<PlatformRole, ModuleKey[]>> | null | undefined,
): Record<PlatformRole, ModuleKey[]> {
  const base = defaultModuleAccess();
  if (!raw) return base;

  for (const role of ALLOWED_ROLES) {
    const modules = raw[role];
    if (!Array.isArray(modules)) continue;
    const cleaned = modules.filter((key): key is ModuleKey =>
      typeof key === "string" && key in MODULE_LABELS,
    );
    // Profil toujours disponible pour tout responsable actif
    if (!cleaned.includes("profil")) cleaned.push("profil");
    // Admin / centre / chapitre : accès Paramètres (gestion des responsables)
    if (
      (role === "admin" || role === "centre" || role === "chapitre") &&
      !cleaned.includes("settings")
    ) {
      cleaned.push("settings");
    }
    // District / groupe : pas d’accès Paramètres
    if (role === "district" || role === "groupe") {
      const settingsIdx = cleaned.indexOf("settings");
      if (settingsIdx >= 0) cleaned.splice(settingsIdx, 1);
    }
    // Admin / centre gardent toujours la gestion organisationnelle
    if (role === "admin" || role === "centre") {
      for (const key of ORG_MODULES) {
        if (!cleaned.includes(key)) cleaned.push(key);
      }
    }
    base[role] = cleaned;
  }
  return base;
}

export function loadModuleAccess(): Record<PlatformRole, ModuleKey[]> {
  if (typeof window === "undefined") return defaultModuleAccess();
  try {
    const raw = window.localStorage.getItem(RBAC_STORAGE_KEY);
    if (!raw) return defaultModuleAccess();
    return sanitizeAccess(JSON.parse(raw) as Partial<Record<PlatformRole, ModuleKey[]>>);
  } catch {
    return defaultModuleAccess();
  }
}

export function saveModuleAccess(access: Record<PlatformRole, ModuleKey[]>) {
  const cleaned = sanitizeAccess(access);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent(RBAC_CHANGED_EVENT, { detail: cleaned }));
  }
  return cleaned;
}

export function resetModuleAccess() {
  return saveModuleAccess(defaultModuleAccess());
}

export function accessToMatrix(access: Record<PlatformRole, ModuleKey[]>): RbacMatrixRow[] {
  return RBAC_CONFIGURABLE_MODULES.map((moduleKey) => ({
    moduleKey,
    module: MODULE_LABELS[moduleKey],
    roles: Object.fromEntries(
      ALLOWED_ROLES.map((role) => [role, access[role].includes(moduleKey)]),
    ) as Record<PlatformRole, boolean>,
  }));
}

export function matrixToAccess(matrix: RbacMatrixRow[]): Record<PlatformRole, ModuleKey[]> {
  const next = defaultModuleAccess();
  for (const role of ALLOWED_ROLES) {
    const modules = matrix
      .filter((row) => row.roles[role])
      .map((row) => row.moduleKey);
    if (!modules.includes("profil")) modules.push("profil");
    next[role] = modules;
  }
  return sanitizeAccess(next);
}

export function modulesForRole(role: PlatformRole): ModuleKey[] {
  return loadModuleAccess()[role] ?? [];
}
