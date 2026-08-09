import type { PlatformRole } from "./roles";
import { CHAPITRE_NAMES, defaultChapitre } from "./orgHierarchy";

export type ProfileStatus = "Actif" | "En attente" | "Suspendu";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: PlatformRole;
  status: ProfileStatus;
  chapitre: string;
  department: string;
  telephone: string;
  quartier: string;
  bio: string;
}

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 1,
    name: "Amina Kasongo",
    email: "amina.kasongo@sgi.org",
    role: "admin",
    status: "Actif",
    chapitre: "Centre Miroir Parfait",
    department: "Direction générale",
    telephone: "+225 07 11 22 33 44",
    quartier: "Plateau",
    bio: "Pilotage stratégique du Centre Miroir Parfait et coordination nationale.",
  },
  {
    id: 2,
    name: "Jean-Michel Luyeye",
    email: "jm.luyeye@sgi.org",
    role: "centre",
    status: "Actif",
    chapitre: "Centre Miroir Parfait",
    department: "Administration",
    telephone: "+225 05 22 33 44 55",
    quartier: "Cocody",
    bio: "Responsable centre — suivi opérationnel, finances et contenu.",
  },
  {
    id: 3,
    name: "Eric Mbenza",
    email: "eric.mbenza@sgi.org",
    role: "chapitre",
    status: "Actif",
    chapitre: CHAPITRE_NAMES[0],
    department: "Coordination",
    telephone: "+225 07 55 66 77 88",
    quartier: "Cocody",
    bio: "Animation du chapitre Rissho Ankoku Ron et consolidation des districts.",
  },
  {
    id: 4,
    name: "Clara Ndaye",
    email: "clara.ndaye@sgi.org",
    role: "district",
    status: "Actif",
    chapitre: CHAPITRE_NAMES[0],
    department: "District Bodhisattva",
    telephone: "+225 05 12 34 56 78",
    quartier: "Marcory",
    bio: "Suivi des groupes BODDHISATTVA, BONTEN et PREUVE ACTUELLE (RISHO ANKOKURON).",
  },
  {
    id: 5,
    name: "Josephine Mbala",
    email: "josephine.mbala@sgi.org",
    role: "groupe",
    status: "En attente",
    chapitre: CHAPITRE_NAMES[0],
    department: "Groupe BODDHISATTVA",
    telephone: "+225 01 98 76 54 32",
    quartier: "Yopougon",
    bio: "Accompagnement des membres du groupe BODDHISATTVA au quotidien.",
  },
];

const PASSWORD_PREFIX = "sgi-user-password:";

export function getStoredPassword(role: PlatformRole) {
  if (typeof window === "undefined") return "sgi2026";
  return window.localStorage.getItem(`${PASSWORD_PREFIX}${role}`) || "sgi2026";
}

export function setStoredPassword(role: PlatformRole, password: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${PASSWORD_PREFIX}${role}`, password);
}

export function profileInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export { defaultChapitre };
