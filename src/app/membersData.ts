import { landingImages } from "../assets/landing/images";
import type { MemberRecord } from "./memberFormUtils";
import { ORG_HIERARCHY, flattenOrgPlacements } from "./orgHierarchy";

const L = landingImages.leaders;
const T = landingImages.testimonials;
/** Portraits ouest-africains uniquement (pas de visages occidentaux). */
const PHOTOS = [L.centre, L.homme, L.femme, L.jeunesse, L.jeuneHomme, L.jeuneFille, L.chapitre1, L.chapitre2, L.chapitre3, T.man, T.woman];
const CHAPTER_PHOTOS = [L.chapitre1, L.chapitre2, L.chapitre3] as const;

const FIRST_NAMES = [
  "Kouassi",
  "Amani",
  "Diallo",
  "Konan",
  "Touré",
  "Bamba",
  "Coulibaly",
  "Yao",
  "N’Guessan",
  "Koffi",
  "Traoré",
  "Ouattara",
  "Soro",
  "Adjoua",
  "Akissi",
  "Affoué",
  "Jean",
  "Marie",
  "Ibrahim",
  "Fatou",
  "Serge",
  "Awa",
  "Pacôme",
  "Estelle",
  "Mariam",
  "Bernard",
  "Grace",
  "Alain",
  "Nadia",
  "Hervé",
];

const LAST_NAMES = [
  "Kouamé",
  "Brou",
  "Koné",
  "Doh",
  "Aka",
  "Gnahoré",
  "Assi",
  "Blé",
  "Dago",
  "Ehouman",
  "Fofana",
  "Guei",
  "Hoba",
  "Kassi",
  "Loba",
  "Meité",
  "N'Da",
  "Sako",
  "Tano",
  "Zadi",
];

function buildSeedMembers(): MemberRecord[] {
  const placements = flattenOrgPlacements();
  const members: MemberRecord[] = [];
  let id = 1;

  // Un membre (responsable de groupe) par groupe — le district responsable voit ainsi tous ses groupes.
  for (const placement of placements) {
    const chapter = ORG_HIERARCHY.find((item) => item.name === placement.chapitre)!;
    const districtIndex = chapter.districts.findIndex((item) => item.name === placement.district);
    const groupeIndex = chapter.districts[districtIndex].groupes.indexOf(placement.groupe);
    const chapterIndex = ORG_HIERARCHY.findIndex((item) => item.name === placement.chapitre);

    let responsabilite = "Responsable groupe";
    if (chapterIndex === 0 && districtIndex === 0 && groupeIndex === 0) {
      responsabilite = "Responsable centre";
    } else if (districtIndex === 0 && groupeIndex === 0) {
      responsabilite = "Responsable chapitre";
    } else if (groupeIndex === 0) {
      responsabilite = "Responsable district";
    }

    const categories = ["Homme", "Femme", "Jeune homme", "Jeune fille", "Avenir"] as const;
    const categorie = categories[(id - 1) % categories.length];
    const prenom = FIRST_NAMES[(id - 1) % FIRST_NAMES.length];
    const nom = LAST_NAMES[(id - 1) % LAST_NAMES.length];
    const photo =
      responsabilite === "Responsable chapitre"
        ? CHAPTER_PHOTOS[chapterIndex % CHAPTER_PHOTOS.length]
        : responsabilite === "Responsable centre"
          ? L.centre
          : PHOTOS[(id - 1) % PHOTOS.length];

    members.push({
      id,
      nom,
      prenom,
      email: `${prenom.toLowerCase().replace(/[^a-z]/g, "")}.${nom.toLowerCase().replace(/[^a-z]/g, "")}@centre-mp.ci`,
      telephone: `+225 07 ${String(10 + id).padStart(2, "0")} ${String(20 + id).padStart(2, "0")} ${String(30 + id).padStart(2, "0")}`,
      dateNaissance: `${1985 + (id % 20)}-${String((id % 12) + 1).padStart(2, "0")}-15`,
      departement: responsabilite.includes("centre")
        ? "Direction"
        : responsabilite.includes("chapitre")
          ? "Coordination"
          : responsabilite.includes("district")
            ? "District"
            : "Groupe",
      categorie,
      responsabilite,
      dateDebutPratique: `${2010 + (id % 12)}-03-01`,
      abonnementVaguePaix: id % 3 !== 0,
      sokahan: id % 2 === 0,
      quartier: ["Cocody", "Yopougon", "Plateau", "Marcory", "Abobo", "Treichville"][(id - 1) % 6],
      chapitre: placement.chapitre,
      district: placement.district,
      groupe: placement.groupe,
      statut: id % 11 === 0 ? "En attente" : id % 13 === 0 ? "Suspendu" : "Actif",
      adhesion: `2025-${String((id % 12) + 1).padStart(2, "0")}-10`,
      abonnement: id % 4 !== 0,
      photo,
      totalDons: 10_000 * ((id % 8) + 1),
    });
    id += 1;
  }

  return members;
}

export const MEMBERS_SEED: MemberRecord[] = buildSeedMembers();

export function memberFullName(member: Pick<MemberRecord, "prenom" | "nom">) {
  return `${member.prenom} ${member.nom}`;
}

export function findMemberPhotoByName(fullName: string, members: MemberRecord[] = MEMBERS_SEED) {
  const match = members.find((member) => memberFullName(member) === fullName);
  return match?.photo || "";
}
