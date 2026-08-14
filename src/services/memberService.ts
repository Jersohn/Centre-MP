import { supabase, isSupabaseEnabled } from "./supabaseClient";
import { resolveOrgIds } from "./orgService";
import { listProfiles } from "./profileService";
import type { MemberFormValues, MemberRecord } from "../app/memberFormUtils";
import type { AppRole, MemberRow, ProfileRow } from "../types/supabase";

const CATEGORIE_TO_DB: Record<string, string> = {
  Homme: "homme",
  Femme: "femme",
  "Jeune homme": "jeune_homme",
  "Jeune fille": "jeune_fille",
  Avenir: "avenir",
};

const CATEGORIE_FROM_DB: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
  jeune_homme: "Jeune homme",
  jeune_fille: "Jeune fille",
  avenir: "Avenir",
};

const RESPONSABILITE_TO_DB: Record<string, string> = {
  "Membre simple": "membre_simple",
  Membre: "membre_simple",
  "Responsable groupe": "responsable_groupe",
  "Responsable district": "responsable_district",
  "Responsable chapitre": "responsable_chapitre",
  "Responsable centre": "responsable_centre",
};

const RESPONSABILITE_FROM_DB: Record<string, string> = {
  membre_simple: "Membre simple",
  responsable_groupe: "Responsable groupe",
  responsable_district: "Responsable district",
  responsable_chapitre: "Responsable chapitre",
  responsable_centre: "Responsable centre",
};

const STATUT_TO_DB: Record<string, string> = {
  Actif: "actif",
  "En attente": "en_attente",
  Suspendu: "suspendu",
};

const STATUT_FROM_DB: Record<string, string> = {
  actif: "Actif",
  en_attente: "En attente",
  suspendu: "Suspendu",
};

const ROLE_TO_RESPONSABILITE: Record<AppRole, string> = {
  admin: "Responsable centre",
  centre: "Responsable centre",
  chapitre: "Responsable chapitre",
  district: "Responsable district",
  groupe: "Responsable groupe",
};

function toSqlDate(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const fr = raw.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (fr) {
    return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  }
  return null;
}

function stableNumericId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) {
    hash = (hash * 31 + uuid.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function splitFullName(fullName: string): { prenom: string; nom: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { prenom: "", nom: "" };
  if (parts.length === 1) return { prenom: parts[0], nom: "" };
  return { prenom: parts[0], nom: parts.slice(1).join(" ") };
}

type MemberDbRow = MemberRow & {
  date_naissance?: string | null;
  departement?: string | null;
  categorie?: string | null;
  responsabilite?: string | null;
  date_debut_pratique?: string | null;
  abonnement?: boolean | null;
  quartier?: string | null;
  chapitres?: { name: string } | null;
  districts?: { name: string } | null;
  groupes?: { name: string } | null;
};

export function mapMemberRow(row: MemberDbRow): MemberRecord {
  const categorie =
    CATEGORIE_FROM_DB[row.categorie || ""] ||
    row.departement ||
    "Homme";
  return {
    id: stableNumericId(row.id),
    remoteId: row.id,
    source: "member",
    prenom: row.prenom,
    nom: row.nom,
    email: row.email || "",
    telephone: row.telephone || "",
    dateNaissance: row.date_naissance || "",
    departement: row.departement || categorie,
    categorie,
    responsabilite: RESPONSABILITE_FROM_DB[row.responsabilite || ""] || "Membre simple",
    dateDebutPratique: row.date_debut_pratique || "",
    abonnementVaguePaix: Boolean(row.abonnement_vague_paix),
    sokahan: Boolean(row.sokahan),
    gohonzon: Boolean(row.gohonzon),
    quartier: row.quartier || "",
    chapitre: row.chapitres?.name || "",
    district: row.districts?.name || "",
    groupe: row.groupes?.name || "",
    chapitreId: row.chapitre_id || null,
    districtId: row.district_id || null,
    groupeId: row.groupe_id || null,
    statut: STATUT_FROM_DB[row.statut] || "Actif",
    abonnement: Boolean(row.abonnement),
    photo: row.photo_url || "",
    adhesion: row.adhesion || "",
    totalDons: Number(row.total_dons || 0),
  };
}

function mapProfileAsMember(row: ProfileRow): MemberRecord | null {
  // Uniquement les responsables rattachés à l’organisation (ex. centre rattaché à un groupe).
  if (!row.chapitre_id && !row.district_id && !row.groupe_id) return null;
  if (row.role === "admin" && !row.groupe_id) return null;

  const split = splitFullName(row.full_name || "");
  const prenom = row.prenom?.trim() || split.prenom;
  const nom = row.nom?.trim() || split.nom;
  const department =
    row.department && ["Homme", "Femme", "Jeune homme", "Jeune fille", "Avenir"].includes(row.department)
      ? row.department
      : "Homme";

  return {
    id: stableNumericId(`profile:${row.id}`),
    remoteId: row.id,
    source: "profile",
    prenom,
    nom,
    email: row.email || "",
    telephone: row.telephone || "",
    dateNaissance: row.date_naissance || "",
    departement: department,
    categorie: department,
    responsabilite: ROLE_TO_RESPONSABILITE[row.role] || "Membre simple",
    dateDebutPratique: row.date_debut_pratique || "",
    abonnementVaguePaix: Boolean(row.abonnement_vague_paix),
    sokahan: Boolean(row.sokahan),
    gohonzon: Boolean(row.gohonzon),
    quartier: row.quartier || "",
    chapitre: row.chapitre_name || "",
    district: row.district_name || "",
    groupe: row.groupe_name || "",
    chapitreId: row.chapitre_id || null,
    districtId: row.district_id || null,
    groupeId: row.groupe_id || null,
    statut: STATUT_FROM_DB[row.status] || "Actif",
    abonnement: Boolean(row.abonnement),
    photo: row.photo_url || "",
    adhesion: (row.created_at || "").slice(0, 10),
    totalDons: 0,
  };
}

export function hasRemoteMembers() {
  return isSupabaseEnabled();
}

export async function listMembersRemote(): Promise<{
  data: MemberRecord[];
  error: Error | null;
}> {
  if (!isSupabaseEnabled() || !supabase) {
    return { data: [], error: new Error("Service indisponible.") };
  }

  const { data, error } = await supabase
    .from("members")
    .select(
      "id, prenom, nom, email, telephone, date_naissance, departement, categorie, responsabilite, date_debut_pratique, abonnement_vague_paix, sokahan, gohonzon, abonnement, quartier, chapitre_id, district_id, groupe_id, statut, photo_url, adhesion, total_dons, chapitres(name), districts(name), groupes(name)",
    )
    .order("nom", { ascending: true })
    .order("prenom", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const members = ((data || []) as MemberDbRow[]).map(mapMemberRow);

  // Inclure les responsables (profiles) rattachés à un chapitre/district/groupe
  // s’ils n’ont pas déjà une fiche membre (dédupliqués par e-mail).
  // listProfiles est réservé admin/centre/chapitre — ignore silencieusement sinon.
  const { data: profiles, error: profilesError } = await listProfiles();
  const emails = new Set(
    members
      .map((item) => item.email.trim().toLowerCase())
      .filter(Boolean),
  );

  const fromProfiles: MemberRecord[] = [];
  if (!profilesError && profiles) {
    for (const profile of profiles) {
      const email = (profile.email || "").trim().toLowerCase();
      if (email && emails.has(email)) continue;
      const asMember = mapProfileAsMember(profile);
      if (!asMember) continue;
      if (email) emails.add(email);
      fromProfiles.push(asMember);
    }
  }

  return {
    data: [...members, ...fromProfiles].sort((a, b) => {
      const byNom = a.nom.localeCompare(b.nom, "fr");
      return byNom !== 0 ? byNom : a.prenom.localeCompare(b.prenom, "fr");
    }),
    error: null,
  };
}

async function resolveOptionalOrgIds(
  values: MemberFormValues,
  orgIdsOverride?: { chapitre_id?: string | null; district_id?: string | null; groupe_id?: string | null } | null,
) {
  if (orgIdsOverride?.chapitre_id && orgIdsOverride?.district_id && orgIdsOverride?.groupe_id) {
    return {
      chapitre_id: orgIdsOverride.chapitre_id,
      district_id: orgIdsOverride.district_id,
      groupe_id: orgIdsOverride.groupe_id,
    };
  }
  if (!values.chapitre && !values.district && !values.groupe) return null;
  const resolved = await resolveOrgIds({
    chapitre: values.chapitre,
    district: values.district,
    groupe: values.groupe,
  });
  if (resolved.error) return null;
  if (resolved.data.chapitre_id && resolved.data.district_id && resolved.data.groupe_id) {
    return {
      chapitre_id: resolved.data.chapitre_id,
      district_id: resolved.data.district_id,
      groupe_id: resolved.data.groupe_id,
    };
  }
  return null;
}

export async function createMemberRemote(
  values: MemberFormValues,
  orgIdsOverride?: { chapitre_id: string; district_id: string; groupe_id: string } | null,
): Promise<{
  data: { id: string } | null;
  error: Error | null;
}> {
  if (!isSupabaseEnabled() || !supabase) {
    return { data: null, error: new Error("Service indisponible.") };
  }

  const orgIds = await resolveOptionalOrgIds(values, orgIdsOverride);

  const payload = {
    prenom: values.prenom.trim(),
    nom: values.nom.trim(),
    email: values.email.trim().toLowerCase() || null,
    telephone: values.telephone.trim(),
    date_naissance: toSqlDate(values.dateNaissance),
    departement: values.departement.trim() || values.categorie.trim() || "Homme",
    categorie:
      CATEGORIE_TO_DB[values.departement] ||
      CATEGORIE_TO_DB[values.categorie] ||
      "homme",
    responsabilite: RESPONSABILITE_TO_DB[values.responsabilite] || "membre_simple",
    date_debut_pratique: toSqlDate(values.dateDebutPratique),
    abonnement_vague_paix: Boolean(values.abonnementVaguePaix),
    sokahan: Boolean(values.sokahan),
    gohonzon: Boolean(values.gohonzon),
    abonnement: Boolean(values.abonnement),
    quartier: values.quartier.trim(),
    chapitre_id: orgIds?.chapitre_id || null,
    district_id: orgIds?.district_id || null,
    groupe_id: orgIds?.groupe_id || null,
    statut: STATUT_TO_DB[values.statut] || "actif",
    photo_url: values.photo?.startsWith("http") ? values.photo : "",
  };

  const { data, error } = await supabase.from("members").insert(payload).select("id").single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string }, error: null };
}

export async function updateMemberRemote(
  memberId: string,
  values: MemberFormValues,
  orgIdsOverride?: { chapitre_id: string; district_id: string; groupe_id: string } | null,
): Promise<{ data: { id: string } | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) {
    return { data: null, error: new Error("Service indisponible.") };
  }
  if (!memberId.trim()) {
    return { data: null, error: new Error("Identifiant membre manquant.") };
  }

  const orgIds = await resolveOptionalOrgIds(values, orgIdsOverride);

  const payload: Record<string, unknown> = {
    prenom: values.prenom.trim(),
    nom: values.nom.trim(),
    email: values.email.trim().toLowerCase() || null,
    telephone: values.telephone.trim(),
    date_naissance: toSqlDate(values.dateNaissance),
    departement: values.departement.trim() || values.categorie.trim() || "Homme",
    categorie:
      CATEGORIE_TO_DB[values.departement] ||
      CATEGORIE_TO_DB[values.categorie] ||
      "homme",
    responsabilite: RESPONSABILITE_TO_DB[values.responsabilite] || "membre_simple",
    date_debut_pratique: toSqlDate(values.dateDebutPratique),
    abonnement_vague_paix: Boolean(values.abonnementVaguePaix),
    sokahan: Boolean(values.sokahan),
    gohonzon: Boolean(values.gohonzon),
    abonnement: Boolean(values.abonnement),
    quartier: values.quartier.trim(),
    statut: STATUT_TO_DB[values.statut] || "actif",
    photo_url: values.photo?.startsWith("http") ? values.photo : "",
  };
  if (orgIds) {
    payload.chapitre_id = orgIds.chapitre_id;
    payload.district_id = orgIds.district_id;
    payload.groupe_id = orgIds.groupe_id;
  }

  const { data, error } = await supabase
    .from("members")
    .update(payload)
    .eq("id", memberId)
    .select("id")
    .single();
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { id: string }, error: null };
}

export async function deleteMemberRemote(
  memberId: string,
): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) {
    return { error: new Error("Service indisponible.") };
  }
  if (!memberId.trim()) {
    return { error: new Error("Identifiant membre manquant.") };
  }
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}

export async function setMemberStatusRemote(
  memberId: string,
  statut: string,
): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) {
    return { error: new Error("Service indisponible.") };
  }
  if (!memberId.trim()) {
    return { error: new Error("Identifiant membre manquant.") };
  }
  const { error } = await supabase
    .from("members")
    .update({ statut: STATUT_TO_DB[statut] || "suspendu" })
    .eq("id", memberId);
  if (error) return { error: new Error(error.message) };
  return { error: null };
}
