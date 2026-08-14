import type { PlatformRole } from "./roles";

/** Émis quand le profil connecté change (photo / nom) pour rafraîchir le shell dashboard. */
export const PROFILE_UPDATED_EVENT = "sgi-profile-updated";

export type ProfileStatus = "Actif" | "En attente" | "Suspendu";

export interface UserProfile {
  id: number;
  name: string;
  prenom?: string;
  nom?: string;
  email: string;
  role: PlatformRole;
  status: ProfileStatus;
  chapitre: string;
  district?: string;
  groupe?: string;
  department: string;
  telephone: string;
  quartier: string;
  bio: string;
  photo?: string;
  dateNaissance?: string;
  dateDebutPratique?: string;
  sokahan?: boolean;
  gohonzon?: boolean;
  abonnementVaguePaix?: boolean;
  abonnement?: boolean;
}

/** Plus de comptes de démonstration — la source de vérité est Supabase `profiles`. */
export const INITIAL_PROFILES: UserProfile[] = [];

export function profileInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

/** Purge les faux comptes / profils locaux hérités des seeds. */
export function purgeMockAccountStorage() {
  if (typeof window === "undefined") return;

  const mockEmails = new Set([
    "amina.kasongo@sgi.org",
    "jm.luyeye@sgi.org",
    "eric.mbenza@sgi.org",
    "clara.ndaye@sgi.org",
    "josephine.mbala@sgi.org",
  ]);

  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;
    if (
      key.startsWith("sgi-profile:") ||
      key.startsWith("sgi-user-password:") ||
      key === "sgi-managed-users" ||
      key === "sgi-user-invites" ||
      key === "sgi-user-credentials"
    ) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }

  // Sécurité : si une ancienne liste a été rechargée ailleurs, filtrer les e-mails mock
  try {
    const raw = window.localStorage.getItem("sgi-managed-users");
    if (!raw) return;
    const users = JSON.parse(raw) as Array<{ email?: string }>;
    if (!Array.isArray(users)) return;
    const cleaned = users.filter((user) => !mockEmails.has((user.email || "").toLowerCase()));
    if (cleaned.length !== users.length) {
      window.localStorage.setItem("sgi-managed-users", JSON.stringify(cleaned));
    }
  } catch {
    /* ignore */
  }
}
