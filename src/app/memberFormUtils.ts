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
  adhesion: string;
  totalDons: number;
}

export function createMemberFromForm(values: MemberFormValues, existingMembers: MemberRecord[]) {
  const prenom = values.prenom.trim();
  const nom = values.nom.trim();
  const email = values.email.trim().toLowerCase();
  const nextId = existingMembers.reduce((max, m) => Math.max(max, m.id), 0) + 1;

  return {
    id: nextId,
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

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
