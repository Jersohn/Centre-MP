import type { MemberRecord } from "./memberFormUtils";

/** Liste initiale vide — les membres sont ajoutés via le module Membres / import. */
export const MEMBERS_SEED: MemberRecord[] = [];

export function memberFullName(member: Pick<MemberRecord, "prenom" | "nom">) {
  return `${member.prenom} ${member.nom}`;
}

export function findMemberPhotoByName(fullName: string, members: MemberRecord[] = MEMBERS_SEED) {
  const match = members.find((member) => memberFullName(member) === fullName);
  return match?.photo || "";
}
