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
  quartier: string;
  chapitre: string;
  district: string;
  statut: string;
  cotisation: string;
  abonnement: boolean;
}

export interface MemberRecord extends MemberFormValues {
  id: number;
  adhesion: string;
  totalCotisations: number;
  totalDons: number;
}

export function createMemberFromForm(values: MemberFormValues, existingMembers: MemberRecord[]) {
  const prenom = values.prenom.trim();
  const nom = values.nom.trim();
  const email = values.email.trim().toLowerCase();

  return {
    id: (existingMembers.at(-1)?.id ?? 0) + 1,
    prenom,
    nom,
    email,
    telephone: values.telephone.trim(),
    dateNaissance: values.dateNaissance,
    departement: values.departement,
    categorie: values.categorie,
    responsabilite: values.responsabilite,
    dateDebutPratique: values.dateDebutPratique,
    abonnementVaguePaix: values.abonnementVaguePaix,
    quartier: values.quartier,
    chapitre: values.chapitre,
    district: values.district,
    statut: values.statut,
    cotisation: values.cotisation,
    abonnement: values.abonnement,
    adhesion: new Date().toISOString().slice(0, 10),
    totalCotisations: 0,
    totalDons: 0,
  } satisfies MemberRecord;
}
