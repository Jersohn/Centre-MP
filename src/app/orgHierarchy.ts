/** Hiérarchie organisationnelle du Centre Miroir Parfait (3 chapitres · 9 districts · 20 groupes). */

export type OrgDistrict = {
  name: string;
  groupes: string[];
};

export type OrgChapter = {
  name: string;
  districts: OrgDistrict[];
};

export type OrgPlacement = {
  chapitre: string;
  district: string;
  groupe: string;
};

export const CENTRE_NAME = "Centre Miroir Parfait";

/**
 * Répartition des 20 groupes du centre :
 * - Rissho Ankoku Ron : 7 groupes / 3 districts
 * - Shin Gyo Gaku     : 7 groupes / 3 districts
 * - Trois Trésors     : 6 groupes / 3 districts
 */
export const ORG_HIERARCHY: OrgChapter[] = [
  {
    name: "Rissho Ankoku Ron",
    districts: [
      {
        name: "District Bodhisattva",
        groupes: ["BODDHISATTVA", "BONTEN", "PREUVE ACTUELLE (RISHO ANKOKURON)"],
      },
      {
        name: "District Victoire",
        groupes: ["VICTOIRE", "ESPÉRANCE"],
      },
      {
        name: "District Foi",
        groupes: ["DAIMOKU DE LA FOI ET LOTUS", "ESPRIT GAKKAI"],
      },
    ],
  },
  {
    name: "Shin Gyo Gaku",
    districts: [
      {
        name: "District Shinjin",
        groupes: ["PREUVE ACTUELLE (SHIN GYO GAKU)", "SHINJIN", "ISHINTAI"],
      },
      {
        name: "District Kanjin",
        groupes: ["KANJIN", "KANSAI"],
      },
      {
        name: "District Kudoku",
        groupes: ["KUDOKU", "RÉVOLUTION HUMAINE"],
      },
    ],
  },
  {
    name: "Trois Trésors",
    districts: [
      {
        name: "District Lumière",
        groupes: ["LA LUMIÈRE", "LA SAGESSE"],
      },
      {
        name: "District Paix",
        groupes: ["LA PAIX", "PRINTEMPS"],
      },
      {
        name: "District Trésors",
        groupes: ["ROI LION", "TOUR AUX TRÉSORS"],
      },
    ],
  },
];

export const CHAPITRE_NAMES = ORG_HIERARCHY.map((chapter) => chapter.name);

export const ALL_DISTRICT_NAMES = ORG_HIERARCHY.flatMap((chapter) =>
  chapter.districts.map((district) => district.name),
);

export const ALL_GROUPE_NAMES = ORG_HIERARCHY.flatMap((chapter) =>
  chapter.districts.flatMap((district) => district.groupes),
);

export function findChapter(chapitre: string): OrgChapter | undefined {
  return ORG_HIERARCHY.find((chapter) => chapter.name === chapitre);
}

export function findDistrict(chapitre: string, district: string): OrgDistrict | undefined {
  return findChapter(chapitre)?.districts.find((item) => item.name === district);
}

export function districtsForChapitre(chapitre: string): string[] {
  return findChapter(chapitre)?.districts.map((district) => district.name) ?? [];
}

export function groupesForDistrict(chapitre: string, district: string): string[] {
  return findDistrict(chapitre, district)?.groupes.slice() ?? [];
}

export function groupesForChapitre(chapitre: string): string[] {
  return findChapter(chapitre)?.districts.flatMap((district) => district.groupes) ?? [];
}

export function findPlacementForGroupe(groupe: string): OrgPlacement | undefined {
  for (const chapter of ORG_HIERARCHY) {
    for (const district of chapter.districts) {
      if (district.groupes.includes(groupe)) {
        return { chapitre: chapter.name, district: district.name, groupe };
      }
    }
  }
  return undefined;
}

export function flattenOrgPlacements(): OrgPlacement[] {
  return ORG_HIERARCHY.flatMap((chapter) =>
    chapter.districts.flatMap((district) =>
      district.groupes.map((groupe) => ({
        chapitre: chapter.name,
        district: district.name,
        groupe,
      })),
    ),
  );
}

export function defaultChapitre() {
  return CHAPITRE_NAMES[0];
}

export function defaultDistrict(chapitre = defaultChapitre()) {
  return districtsForChapitre(chapitre)[0] || ALL_DISTRICT_NAMES[0];
}

export function defaultGroupe(chapitre = defaultChapitre(), district = defaultDistrict(chapitre)) {
  return groupesForDistrict(chapitre, district)[0] || ALL_GROUPE_NAMES[0];
}

/** Corrige district/groupe si le chapitre change (listes en cascade). */
export function coerceOrgSelection(input: {
  chapitre: string;
  district: string;
  groupe: string;
}): OrgPlacement {
  const chapitre = CHAPITRE_NAMES.includes(input.chapitre) ? input.chapitre : defaultChapitre();
  const districts = districtsForChapitre(chapitre);
  const district = districts.includes(input.district) ? input.district : districts[0];
  const groupes = groupesForDistrict(chapitre, district);
  const groupe = groupes.includes(input.groupe) ? input.groupe : groupes[0];
  return { chapitre, district, groupe };
}
