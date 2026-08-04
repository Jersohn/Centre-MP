export type PlatformRole = "admin" | "centre" | "chapitre" | "district" | "groupe";

export const ALLOWED_ROLES: PlatformRole[] = ["admin", "centre", "chapitre", "district", "groupe"];

export const ROLE_LABELS: Record<PlatformRole, string> = {
  admin: "Administrateur",
  centre: "Responsable centre",
  chapitre: "Responsable chapitre",
  district: "Responsable district",
  groupe: "Responsable groupe",
};

export type ModuleKey = "dashboard" | "membres" | "finances" | "directives" | "statistiques" | "settings" | "contenu";

export const MODULE_ACCESS: Record<PlatformRole, ModuleKey[]> = {
  admin: ["dashboard", "membres", "finances", "directives", "statistiques", "settings", "contenu"],
  centre: ["dashboard", "membres", "directives", "statistiques", "settings", "contenu"],
  chapitre: ["dashboard", "membres", "directives", "statistiques", "settings"],
  district: ["dashboard", "membres", "directives", "statistiques", "settings"],
  groupe: ["dashboard", "membres", "directives", "statistiques", "settings"],
};
