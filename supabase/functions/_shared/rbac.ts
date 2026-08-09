export type AppRole = "admin" | "centre" | "chapitre" | "district" | "groupe";
export type ProfileStatus = "actif" | "en_attente" | "suspendu";

export type CallerProfile = {
  id: string;
  role: AppRole;
  status: ProfileStatus;
  chapitre_id: string | null;
  district_id: string | null;
  groupe_id: string | null;
};

export function canInvite(callerRole: AppRole) {
  return callerRole === "admin" || callerRole === "centre" || callerRole === "chapitre";
}

/** Qui peut mettre à jour un profil (rôle / périmètre) via l’edge function. */
export function canUpsertProfile(callerRole: AppRole) {
  return (
    callerRole === "admin" ||
    callerRole === "centre" ||
    callerRole === "chapitre" ||
    callerRole === "district"
  );
}

/** Qui peut attribuer quel rôle plateforme. */
export function canManageRole(callerRole: AppRole, targetRole: AppRole) {
  if (callerRole === "admin") return true;
  if (callerRole === "centre") return targetRole !== "admin";
  if (callerRole === "chapitre") return targetRole === "district" || targetRole === "groupe";
  if (callerRole === "district") return targetRole === "groupe";
  return false;
}

/** Qui peut modifier le périmètre org d’un autre compte (ou le sien pour centre/admin). */
export function canManageOrgScope(
  callerRole: AppRole,
  targetRole: AppRole,
  isSelf: boolean,
) {
  if (isSelf) return callerRole === "admin" || callerRole === "centre";
  if (callerRole === "admin") return true;
  if (callerRole === "centre") return targetRole !== "admin";
  if (callerRole === "chapitre") return targetRole === "district" || targetRole === "groupe";
  if (callerRole === "district") return targetRole === "groupe";
  return false;
}

/** Suppression de compte : réservée admin / centre (pas soi-même, centre ≠ admin). */
export function canDeleteUser(
  callerRole: AppRole,
  targetRole: AppRole,
  isSelf: boolean,
) {
  if (isSelf) return false;
  if (callerRole === "admin") return true;
  if (callerRole === "centre") return targetRole !== "admin";
  return false;
}

export function randomPassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function cleanOrgId(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeScopeForRole(
  role: AppRole,
  scope: {
    chapitre_id?: string | null;
    district_id?: string | null;
    groupe_id?: string | null;
  },
  caller: CallerProfile,
) {
  let chapitre_id = cleanOrgId(scope.chapitre_id);
  let district_id = cleanOrgId(scope.district_id);
  let groupe_id = cleanOrgId(scope.groupe_id);

  if (caller.role === "chapitre") {
    if (!caller.chapitre_id) {
      throw new Error("Votre profil chapitre n’a pas de chapitre rattaché.");
    }
    chapitre_id = caller.chapitre_id;
  }

  if (role === "admin") {
    return { chapitre_id: null, district_id: null, groupe_id: null };
  }
  if (role === "centre") {
    // Rattachement optionnel à un groupe (appartenance), sans changer le rôle centre.
    if (!chapitre_id && !district_id && !groupe_id) {
      return { chapitre_id: null, district_id: null, groupe_id: null };
    }
    if (chapitre_id && district_id && groupe_id) {
      return { chapitre_id, district_id, groupe_id };
    }
    throw new Error(
      "Pour rattacher un responsable centre, chapitre, district et groupe sont tous requis (ou aucun).",
    );
  }
  if (role === "chapitre") {
    if (!chapitre_id) throw new Error("chapitre_id requis pour le rôle chapitre.");
    // Rattachement optionnel à un groupe (district + groupe, ou aucun).
    if (!district_id && !groupe_id) {
      return { chapitre_id, district_id: null, groupe_id: null };
    }
    if (district_id && groupe_id) {
      return { chapitre_id, district_id, groupe_id };
    }
    throw new Error(
      "Pour rattacher un responsable chapitre à un groupe, district et groupe sont tous requis (ou aucun).",
    );
  }
  if (role === "district") {
    if (!chapitre_id || !district_id) {
      throw new Error("chapitre_id et district_id requis pour le rôle district.");
    }
    // Groupe optionnel (appartenance).
    return { chapitre_id, district_id, groupe_id: groupe_id || null };
  }
  if (!chapitre_id || !district_id || !groupe_id) {
    throw new Error("chapitre_id, district_id et groupe_id requis pour le rôle groupe.");
  }
  return { chapitre_id, district_id, groupe_id };
}
