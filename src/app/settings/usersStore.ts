import { type ProfileStatus, type UserProfile } from "../profilesData";
import type { PlatformRole } from "../roles";
import { defaultChapitre, defaultDistrict, defaultGroupe } from "../orgHierarchy";

export const USERS_STORAGE_KEY = "sgi-managed-users";
export const INVITES_STORAGE_KEY = "sgi-user-invites";
export const CREDENTIALS_STORAGE_KEY = "sgi-user-credentials";
export const USERS_CHANGED_EVENT = "sgi-users-changed";
export const ACCOUNTS_STORAGE_VERSION_KEY = "sgi-accounts-storage-version";
/** Incrémenter pour forcer le vidage des anciens comptes mock en localStorage. */
export const ACCOUNTS_STORAGE_VERSION = "2";

export type ManagedUser = UserProfile & {
  inviteToken?: string;
  invitedAt?: string;
  activatedAt?: string;
  /** UUID Supabase `profiles.id` (auth.users). */
  remoteId?: string;
  chapitreId?: string | null;
  districtId?: string | null;
  groupeId?: string | null;
};

export type UserInvite = {
  token: string;
  userId: number;
  email: string;
  name: string;
  role: PlatformRole;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
};

export type InviteUserInput = {
  name: string;
  email: string;
  role: PlatformRole;
  chapitre?: string;
  district?: string;
  groupe?: string;
  department?: string;
  telephone?: string;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function notifyUsersChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(USERS_CHANGED_EVENT));
}

function createToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureCleanAccountStorage() {
  if (typeof window === "undefined") return;
  const version = window.localStorage.getItem(ACCOUNTS_STORAGE_VERSION_KEY);
  if (version === ACCOUNTS_STORAGE_VERSION) return;
  window.localStorage.removeItem(USERS_STORAGE_KEY);
  window.localStorage.removeItem(INVITES_STORAGE_KEY);
  window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
  window.localStorage.setItem(ACCOUNTS_STORAGE_VERSION_KEY, ACCOUNTS_STORAGE_VERSION);
}

export function loadManagedUsers(): ManagedUser[] {
  ensureCleanAccountStorage();
  const stored = readJson<ManagedUser[] | null>(USERS_STORAGE_KEY, null);
  if (stored && Array.isArray(stored)) return stored;
  writeJson(USERS_STORAGE_KEY, []);
  return [];
}

export function saveManagedUsers(users: ManagedUser[]) {
  writeJson(USERS_STORAGE_KEY, users);
  notifyUsersChanged();
  return users;
}

export function loadInvites(): UserInvite[] {
  return readJson<UserInvite[]>(INVITES_STORAGE_KEY, []);
}

export function saveInvites(invites: UserInvite[]) {
  writeJson(INVITES_STORAGE_KEY, invites);
  return invites;
}

export function loadCredentials(): Record<string, string> {
  return readJson<Record<string, string>>(CREDENTIALS_STORAGE_KEY, {});
}

export function saveCredential(email: string, password: string) {
  const all = loadCredentials();
  all[email.trim().toLowerCase()] = password;
  writeJson(CREDENTIALS_STORAGE_KEY, all);
}

export function verifyCredential(email: string, password: string) {
  const all = loadCredentials();
  const stored = all[email.trim().toLowerCase()];
  if (!stored) return false;
  return stored === password;
}

export function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return loadManagedUsers().find((user) => user.email.toLowerCase() === normalized) ?? null;
}

export function updateManagedUser(id: number, patch: Partial<ManagedUser>) {
  const users = loadManagedUsers().map((user) =>
    user.id === id ? { ...user, ...patch } : user,
  );
  return saveManagedUsers(users);
}

export function deleteManagedUser(id: number) {
  const users = loadManagedUsers().filter((user) => user.id !== id);
  const invites = loadInvites().filter((invite) => invite.userId !== id);
  saveInvites(invites);
  return saveManagedUsers(users);
}

export function buildInviteUrl(token: string) {
  if (typeof window === "undefined") return `/invitation?token=${token}`;
  return `${window.location.origin}/invitation?token=${token}`;
}

export function inviteUser(input: InviteUserInput): {
  user: ManagedUser;
  invite: UserInvite;
  inviteUrl: string;
} {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.name.trim()) {
    throw new Error("Nom et e-mail sont requis.");
  }
  if (findUserByEmail(email)) {
    throw new Error("Un utilisateur avec cet e-mail existe déjà.");
  }

  const users = loadManagedUsers();
  const nextId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;
  const token = createToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const role = input.role;
  const chapitre =
    role === "admin" || role === "centre"
      ? defaultChapitre()
      : input.chapitre || defaultChapitre();
  const district =
    role === "district" || role === "groupe"
      ? input.district || defaultDistrict(chapitre)
      : "";
  const groupe = role === "groupe" ? input.groupe || defaultGroupe(chapitre, district) : "";

  const user: ManagedUser = {
    id: nextId,
    name: input.name.trim(),
    email,
    role,
    status: "En attente",
    chapitre,
    department:
      input.department?.trim() ||
      (role === "groupe" ? groupe : role === "district" ? district : chapitre),
    telephone: input.telephone?.trim() || "",
    quartier: "",
    bio: "",
    photo: "",
    inviteToken: token,
    invitedAt: now.toISOString(),
  };

  const invite: UserInvite = {
    token,
    userId: user.id,
    email,
    name: user.name,
    role,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  saveManagedUsers([...users, user]);
  saveInvites([...loadInvites(), invite]);

  return { user, invite, inviteUrl: buildInviteUrl(token) };
}

/** Création directe d’un responsable actif (sans lien / confirmation e-mail). */
export function createManagedUser(input: InviteUserInput & { password?: string }): {
  user: ManagedUser;
  temporaryPassword: string;
} {
  const email = input.email.trim().toLowerCase();
  if (!email || !input.name.trim()) {
    throw new Error("Nom et e-mail sont requis.");
  }
  if (findUserByEmail(email)) {
    throw new Error("Un utilisateur avec cet e-mail existe déjà.");
  }

  const users = loadManagedUsers();
  const nextId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;
  const now = new Date().toISOString();
  const temporaryPassword =
    input.password?.trim() ||
    `MP${Math.random().toString(36).slice(2, 8)}#${Date.now().toString(36).slice(-3)}`;

  const role = input.role;
  const chapitre =
    role === "admin"
      ? ""
      : input.chapitre || defaultChapitre();
  const district =
    role === "admin"
      ? ""
      : input.district || (role === "centre" ? "" : defaultDistrict(chapitre));
  const groupe =
    role === "admin"
      ? ""
      : input.groupe || (role === "centre" ? "" : defaultGroupe(chapitre, district));

  const user: ManagedUser = {
    id: nextId,
    name: input.name.trim(),
    email,
    role,
    status: "Actif",
    chapitre,
    district,
    groupe,
    department:
      input.department?.trim() ||
      (groupe || district || chapitre),
    telephone: input.telephone?.trim() || "",
    quartier: "",
    bio: "",
    photo: "",
    activatedAt: now,
  };

  saveManagedUsers([...users, user]);
  saveCredential(email, temporaryPassword);
  return { user, temporaryPassword };
}

export function getInviteByToken(token: string) {
  const invite = loadInvites().find((item) => item.token === token) ?? null;
  if (!invite) return null;
  if (invite.acceptedAt) return { invite, status: "accepted" as const, user: null };
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return { invite, status: "expired" as const, user: null };
  }
  const user = loadManagedUsers().find((item) => item.id === invite.userId) ?? null;
  if (!user) return { invite, status: "missing" as const, user: null };
  return { invite, status: "pending" as const, user };
}

export function acceptInvite(token: string, password: string) {
  if (password.trim().length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  }

  const found = getInviteByToken(token);
  if (!found || found.status !== "pending" || !found.user) {
    throw new Error(
      found?.status === "expired"
        ? "Cette invitation a expiré. Demandez un nouveau lien."
        : found?.status === "accepted"
          ? "Cette invitation a déjà été utilisée."
          : "Invitation introuvable.",
    );
  }

  const now = new Date().toISOString();
  updateManagedUser(found.user.id, {
    status: "Actif" as ProfileStatus,
    activatedAt: now,
    inviteToken: undefined,
  });

  const invites = loadInvites().map((invite) =>
    invite.token === token ? { ...invite, acceptedAt: now } : invite,
  );
  saveInvites(invites);
  saveCredential(found.user.email, password.trim());

  return loadManagedUsers().find((user) => user.id === found.user!.id)!;
}

export function resendInvite(userId: number) {
  const user = loadManagedUsers().find((item) => item.id === userId);
  if (!user) throw new Error("Utilisateur introuvable.");

  const token = createToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  updateManagedUser(userId, {
    status: "En attente",
    inviteToken: token,
    invitedAt: now.toISOString(),
    activatedAt: undefined,
  });

  const invites = loadInvites().filter((invite) => invite.userId !== userId);
  const invite: UserInvite = {
    token,
    userId,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  saveInvites([...invites, invite]);

  return { invite, inviteUrl: buildInviteUrl(token) };
}

export function assignableRoles(actor: PlatformRole): PlatformRole[] {
  if (actor === "admin") return ["admin", "centre", "chapitre", "district", "groupe"];
  if (actor === "centre") return ["chapitre", "district", "groupe", "centre"];
  if (actor === "chapitre") return ["district", "groupe"];
  if (actor === "district") return ["groupe"];
  return [];
}
