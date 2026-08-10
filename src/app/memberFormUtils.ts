export interface MemberFormValues {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  dateNaissance: string;
  departement: string;
  categorie: string;
  responsabilite: string;
  dateDebutPratique: string;
  abonnementVaguePaix: boolean;
  sokahan: boolean;
  quartier: string;
  chapitre: string;
  district: string;
  groupe: string;
  statut: string;
  abonnement: boolean;
  photo: string;
}

export interface MemberRecord extends MemberFormValues {
  id: number;
  remoteId?: string;
  /** Fiche `members` réelle vs profil responsable fusionné dans la liste. */
  source?: "member" | "profile";
  chapitreId?: string | null;
  districtId?: string | null;
  groupeId?: string | null;
  adhesion: string;
  totalDons: number;
}

export function emptyMemberFormValues(seed?: Partial<MemberFormValues>): MemberFormValues {
  return {
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    dateNaissance: "",
    departement: "Homme",
    categorie: "Homme",
    responsabilite: "Membre simple",
    dateDebutPratique: "",
    abonnementVaguePaix: true,
    sokahan: false,
    quartier: "",
    chapitre: seed?.chapitre || "",
    district: seed?.district || "",
    groupe: seed?.groupe || "",
    statut: "Actif",
    abonnement: true,
    photo: "",
    ...seed,
  };
}

export function createMemberFromForm(
  values: MemberFormValues,
  existingMembers: MemberRecord[],
  remoteId?: string,
) {
  const prenom = values.prenom.trim();
  const nom = values.nom.trim();
  const email = values.email.trim().toLowerCase();
  const nextId = existingMembers.reduce((max, m) => Math.max(max, m.id), 0) + 1;

  return {
    id: nextId,
    remoteId,
    source: remoteId ? ("member" as const) : undefined,
    prenom,
    nom,
    email,
    telephone: values.telephone.trim(),
    dateNaissance: values.dateNaissance,
    departement: values.departement || values.categorie || "Homme",
    categorie: values.departement || values.categorie || "Homme",
    responsabilite: values.responsabilite,
    dateDebutPratique: values.dateDebutPratique,
    abonnementVaguePaix: values.abonnementVaguePaix,
    sokahan: values.sokahan,
    quartier: values.quartier,
    chapitre: values.chapitre,
    district: values.district,
    groupe: values.groupe || "BODDHISATTVA",
    statut: values.statut,
    abonnement: values.abonnement,
    photo: values.photo || "",
    adhesion: new Date().toISOString().slice(0, 10),
    totalDons: 0,
  } satisfies MemberRecord;
}

/** Applique les valeurs du formulaire sur une fiche membre existante. */
export function applyMemberFormToRecord(
  base: MemberRecord,
  values: MemberFormValues,
  orgIds?: { chapitreId?: string; districtId?: string; groupeId?: string },
): MemberRecord {
  return {
    ...base,
    prenom: values.prenom.trim(),
    nom: values.nom.trim(),
    email: values.email.trim().toLowerCase(),
    telephone: values.telephone.trim(),
    dateNaissance: values.dateNaissance,
    departement: values.departement || values.categorie || "Homme",
    categorie: values.departement || values.categorie || "Homme",
    responsabilite: values.responsabilite,
    dateDebutPratique: values.dateDebutPratique,
    abonnementVaguePaix: values.abonnementVaguePaix,
    sokahan: values.sokahan,
    quartier: values.quartier.trim(),
    chapitre: values.chapitre,
    district: values.district,
    groupe: values.groupe,
    statut: values.statut,
    abonnement: values.abonnement,
    photo: values.photo || "",
    chapitreId: orgIds?.chapitreId ?? base.chapitreId,
    districtId: orgIds?.districtId ?? base.districtId,
    groupeId: orgIds?.groupeId ?? base.groupeId,
  };
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
