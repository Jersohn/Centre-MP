import { platformRoleFromResponsabiliteLabel } from "./responsabilites";
import type { PlatformRole } from "./roles";

/** Rang hiérarchique (plus élevé = autorité supérieure). */
const ROLE_RANK: Record<PlatformRole, number> = {
  admin: 50,
  centre: 40,
  chapitre: 30,
  district: 20,
  groupe: 10,
};

export function roleRank(role: PlatformRole): number {
  return ROLE_RANK[role] ?? 0;
}

/** Convertit une responsabilité membre vers un rôle plateforme, si applicable. */
export function platformRoleFromResponsabilite(responsabilite: string): PlatformRole | null {
  return platformRoleFromResponsabiliteLabel(responsabilite);
}

/**
 * Cible hiérarchiquement supérieure ou de même niveau :
 * le responsable connecté ne peut pas la désactiver, supprimer
 * ni changer sa responsabilité / son rôle.
 */
export function isProtectedHierarchyTarget(
  actorRole: PlatformRole,
  targetRole: PlatformRole | null | undefined,
): boolean {
  if (!targetRole) return false;
  if (actorRole === "admin") return false;
  return roleRank(targetRole) >= roleRank(actorRole);
}

/** Qui peut modifier le périmètre org (chapitre / district / groupe). */
export function canManageOrgScope(
  actorRole: PlatformRole,
  targetRole: PlatformRole,
  isSelf: boolean,
): boolean {
  if (isSelf) return actorRole === "admin" || actorRole === "centre";
  if (isProtectedHierarchyTarget(actorRole, targetRole)) return false;
  if (actorRole === "admin") return true;
  if (actorRole === "centre") return targetRole !== "admin";
  if (actorRole === "chapitre") return targetRole === "district" || targetRole === "groupe";
  if (actorRole === "district") return targetRole === "groupe";
  return false;
}

/** Modification du rôle / statut d’un compte utilisateur. */
export function canManageUserAccount(
  actorRole: PlatformRole,
  targetRole: PlatformRole,
  isSelf: boolean,
): boolean {
  if (isSelf) return false;
  if (targetRole === "admin" && actorRole !== "admin") return false;
  if (isProtectedHierarchyTarget(actorRole, targetRole)) return false;
  if (actorRole === "admin") return true;
  if (actorRole === "centre") return true;
  if (actorRole === "chapitre") return targetRole === "district" || targetRole === "groupe";
  if (actorRole === "district") return targetRole === "groupe";
  return false;
}

/** Suppression de compte : admin et centre, y compris les responsables. Un compte admin n’est jamais supprimé. */
export function canDeleteUser(
  actorRole: PlatformRole,
  targetRole: PlatformRole,
  isSelf: boolean,
): boolean {
  if (isSelf) return false;
  if (targetRole === "admin") return false;
  if (actorRole === "admin" || actorRole === "centre") return true;
  return false;
}

/** Désactivation d’un membre (y compris s’il est aussi responsable). */
export function canDeactivateMember(actorRole: PlatformRole, memberResponsabilite: string): boolean {
  const targetRole = platformRoleFromResponsabilite(memberResponsabilite);
  return !isProtectedHierarchyTarget(actorRole, targetRole);
}

/**
 * Modification de la fiche d’un membre du périmètre.
 * Les fiches « profil responsable » fusionnées ne s’éditent pas ici (Paramètres).
 */
export function canEditMember(
  actorRole: PlatformRole,
  member: { responsabilite: string; source?: "member" | "profile" },
): boolean {
  if (member.source === "profile") return false;
  const targetRole = platformRoleFromResponsabilite(member.responsabilite);
  return !isProtectedHierarchyTarget(actorRole, targetRole);
}

/**
 * Réaffectation chapitre / district / groupe.
 * Les fiches membres du périmètre, et les profils responsables pour admin / centre.
 */
export function canReassignMember(
  actorRole: PlatformRole,
  member: { responsabilite: string; source?: "member" | "profile" },
): boolean {
  const targetRole = platformRoleFromResponsabilite(member.responsabilite);
  if (targetRole === "admin") return false;
  if (actorRole === "groupe") return false;
  if (member.source === "profile") {
    return actorRole === "admin" || actorRole === "centre";
  }
  return !isProtectedHierarchyTarget(actorRole, targetRole);
}

/**
 * Suppression définitive d’un membre :
 * admin et responsable centre, y compris les fiches responsables.
 * Un administrateur ne peut pas être supprimé.
 */
export function canDeleteMember(
  actorRole: PlatformRole,
  member: { responsabilite: string; source?: "member" | "profile" },
): boolean {
  if (actorRole !== "admin" && actorRole !== "centre") return false;
  const targetRole = platformRoleFromResponsabilite(member.responsabilite);
  if (targetRole === "admin") return false;
  return true;
}

/** Changement de responsabilité / promotion d’un membre. */
export function canChangeMemberResponsabilite(
  actorRole: PlatformRole,
  memberResponsabilite: string,
): boolean {
  const targetRole = platformRoleFromResponsabilite(memberResponsabilite);
  if (isProtectedHierarchyTarget(actorRole, targetRole)) return false;
  if (actorRole === "admin" || actorRole === "centre") return true;
  if (actorRole === "chapitre") return true; // sous-jacents / membres simples
  if (actorRole === "district") return true; // promotion vers responsable groupe
  return false;
}

/** Champs org visibles / requis selon le rôle cible. */
export function orgFieldsForRole(role: PlatformRole): {
  chapitre: boolean;
  district: boolean;
  groupe: boolean;
  /** Centre uniquement : peut n’avoir aucun rattachement org. */
  optionalAttachment: boolean;
} {
  if (role === "admin") {
    return { chapitre: false, district: false, groupe: false, optionalAttachment: false };
  }
  if (role === "centre") {
    return { chapitre: true, district: true, groupe: true, optionalAttachment: true };
  }
  // Chapitre / district / groupe : le formulaire enregistre le rattachement complet
  // (groupe d’appartenance), même si le rôle plateforme reste chapitre ou district.
  if (role === "chapitre" || role === "district" || role === "groupe") {
    return { chapitre: true, district: true, groupe: true, optionalAttachment: false };
  }
  return { chapitre: true, district: true, groupe: true, optionalAttachment: false };
}
