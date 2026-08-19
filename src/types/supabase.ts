/** Types alignés sur les migrations Supabase Centre-MP (à régénérer via CLI si besoin). */

export type AppRole = "admin" | "centre" | "chapitre" | "district" | "groupe";
export type ProfileStatus = "actif" | "en_attente" | "suspendu";
export type MemberStatus = "actif" | "en_attente" | "suspendu";
export type MemberResponsibility =
  | "membre_simple"
  | "responsable_groupe"
  | "responsable_district"
  | "responsable_chapitre"
  | "responsable_centre"
  | "responsable_homme_centre"
  | "responsable_femme_centre"
  | "responsable_jeunesse_centre"
  | "responsable_jeune_homme_centre"
  | "responsable_jeune_fille_centre"
  | "responsable_homme_chapitre"
  | "responsable_femme_chapitre"
  | "responsable_jeunesse_chapitre"
  | "responsable_jeune_homme_chapitre"
  | "responsable_jeune_fille_chapitre"
  | "responsable_homme_district"
  | "responsable_femme_district"
  | "responsable_jeunesse_district"
  | "responsable_jeune_homme_district"
  | "responsable_jeune_fille_district"
  | "responsable_homme_groupe"
  | "responsable_femme_groupe"
  | "responsable_jeunesse_groupe"
  | "responsable_jeune_homme_groupe"
  | "responsable_jeune_fille_groupe";
export type CollecteType = "vague_paix" | "zaimu_ordinaire" | "zaimu_special";
export type CollecteStatus = "en_attente" | "valide" | "annule";

export type ChapitreRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  districts_count?: number;
  groupes_count?: number;
};

export type DistrictRow = {
  id: string;
  chapitre_id: string;
  slug: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  chapitre_name?: string | null;
  groupes_count?: number;
};

export type GroupeRow = {
  id: string;
  district_id: string;
  slug: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  district_name?: string | null;
  chapitre_id?: string | null;
  chapitre_name?: string | null;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  prenom?: string;
  nom?: string;
  role: AppRole;
  status: ProfileStatus;
  telephone: string;
  department: string;
  quartier: string;
  bio: string;
  photo_url: string;
  date_naissance?: string | null;
  date_debut_pratique?: string | null;
  sokahan?: boolean;
  gohonzon?: boolean;
  abonnement_vague_paix?: boolean;
  abonnement?: boolean;
  chapitre_id: string | null;
  district_id: string | null;
  groupe_id: string | null;
  created_at: string;
  updated_at: string;
  /** Présents via RPC list_managed_profiles */
  chapitre_name?: string | null;
  district_name?: string | null;
  groupe_name?: string | null;
};

export type MemberRow = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string;
  chapitre_id: string;
  district_id: string;
  groupe_id: string;
  statut: MemberStatus;
  responsabilite?: MemberResponsibility | string | null;
  abonnement_vague_paix: boolean;
  sokahan: boolean;
  gohonzon: boolean;
  photo_url: string;
  adhesion: string;
  total_dons: number;
};

export type CollecteRow = {
  id: string;
  type: CollecteType;
  member_id: string | null;
  membre_label: string;
  montant: number;
  date_collecte: string;
  statut: CollecteStatus;
  chapitre_id: string;
  district_id: string;
  groupe_id: string;
  periode: string;
  motif: string;
  reference_recu: string;
  note: string;
};
