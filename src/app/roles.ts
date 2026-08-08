export type PlatformRole = "admin" | "centre" | "chapitre" | "district" | "groupe";

export const ALLOWED_ROLES: PlatformRole[] = ["admin", "centre", "chapitre", "district", "groupe"];

export const ROLE_LABELS: Record<PlatformRole, string> = {
  admin: "Administrateur",
  centre: "Responsable centre",
  chapitre: "Responsable chapitre",
  district: "Responsable district",
  groupe: "Responsable groupe",
};

export type ModuleKey =
  | "dashboard"
  | "membres"
  | "finances"
  | "collectes"
  | "directives"
  | "statistiques"
  | "settings"
  | "contenu"
  | "profil";

/** Accès admin complet : le responsable centre pilote l’application. */
const ADMIN_MODULES: ModuleKey[] = [
  "dashboard",
  "membres",
  "finances",
  "collectes",
  "statistiques",
  "profil",
  "settings",
  "contenu",
];

/** Chapitre / district : pilotage opérationnel + collectes (VP & zaimu). */
const LOCAL_MODULES: ModuleKey[] = [
  "dashboard",
  "membres",
  "collectes",
  "statistiques",
  "profil",
];

/** Groupe : suivi opérationnel sans module statistiques. */
const GROUPE_MODULES: ModuleKey[] = [
  "dashboard",
  "membres",
  "collectes",
  "profil",
];

export const MODULE_ACCESS: Record<PlatformRole, ModuleKey[]> = {
  admin: [...ADMIN_MODULES],
  centre: [...ADMIN_MODULES],
  chapitre: [...LOCAL_MODULES],
  district: [...LOCAL_MODULES],
  groupe: [...GROUPE_MODULES],
};
