import { supabase, isSupabaseEnabled } from "./supabaseClient";
import { resolveOrgIds } from "./orgService";
import type { CollecteRecord, CollecteStatut, CollecteTab } from "../app/CollectesModule";

const TYPE_TO_DB: Record<CollecteTab, string> = {
  "vague-paix": "vague_paix",
  "zaimu-ordinaire": "zaimu_ordinaire",
  "zaimu-special": "zaimu_special",
};

const TYPE_FROM_DB: Record<string, CollecteTab> = {
  vague_paix: "vague-paix",
  zaimu_ordinaire: "zaimu-ordinaire",
  zaimu_special: "zaimu-special",
};

const STATUT_TO_DB: Record<CollecteStatut, string> = {
  "En attente": "en_attente",
  Validé: "valide",
  Annulé: "annule",
};

const STATUT_FROM_DB: Record<string, CollecteStatut> = {
  en_attente: "En attente",
  valide: "Validé",
  annule: "Annulé",
};

type CollecteEnrichedRow = {
  id: string;
  numero?: string | null;
  type: string;
  member_id: string | null;
  membre_label: string;
  membre_display?: string | null;
  montant: number | string;
  date_collecte: string;
  statut: string;
  chapitre_id: string;
  district_id: string;
  groupe_id: string;
  chapitre_name?: string | null;
  district_name?: string | null;
  groupe_name?: string | null;
  periode: string;
  motif: string;
  reference_recu: string;
  note: string;
};

export function hasRemoteCollectes() {
  return isSupabaseEnabled();
}

/** Ne renvoie un member_id que s’il existe bien dans public.members (évite les UUID de profiles). */
async function resolveValidMemberId(
  candidateId: string | null | undefined,
  membreLabel: string,
): Promise<string | null> {
  if (!supabase) return null;

  if (candidateId) {
    const { data } = await supabase
      .from("members")
      .select("id")
      .eq("id", candidateId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const label = membreLabel.trim();
  if (!label) return null;

  // Fallback : retrouver une fiche membre par prénom + nom
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const prenom = parts[0];
    const nom = parts.slice(1).join(" ");
    const { data } = await supabase
      .from("members")
      .select("id, prenom, nom")
      .ilike("prenom", prenom)
      .ilike("nom", nom)
      .limit(5);
    const exact = (data || []).find(
      (row) =>
        `${row.prenom || ""} ${row.nom || ""}`.trim().toLowerCase() === label.toLowerCase(),
    );
    if (exact?.id) return exact.id;
    if (data?.length === 1) return data[0].id;
  }

  return null;
}

export function mapCollecteRow(row: CollecteEnrichedRow): CollecteRecord {
  return {
    id: row.id,
    numero: (row.numero || "").trim(),
    type: TYPE_FROM_DB[row.type] || "zaimu-ordinaire",
    membre: (row.membre_display || row.membre_label || "").trim(),
    montant: Number(row.montant || 0),
    date: row.date_collecte,
    statut: STATUT_FROM_DB[row.statut] || "En attente",
    chapitre: row.chapitre_name || "",
    district: row.district_name || "",
    groupe: row.groupe_name || "",
    periode: row.periode || "",
    motif: row.motif || "",
    referenceRecu: row.reference_recu || "",
    note: row.note || "",
    orgIds: {
      chapitre_id: row.chapitre_id,
      district_id: row.district_id,
      groupe_id: row.groupe_id,
    },
  };
}

export async function listCollectesRemote(): Promise<{
  data: CollecteRecord[];
  error: Error | null;
}> {
  if (!isSupabaseEnabled() || !supabase) {
    return { data: [], error: new Error("Service indisponible.") };
  }

  const { data, error } = await supabase
    .from("v_collectes_enriched")
    .select(
      "id, numero, type, member_id, membre_label, membre_display, montant, date_collecte, statut, chapitre_id, district_id, groupe_id, chapitre_name, district_name, groupe_name, periode, motif, reference_recu, note",
    )
    .order("date_collecte", { ascending: false });

  if (error) return { data: [], error: new Error(error.message) };
  return {
    data: ((data || []) as CollecteEnrichedRow[]).map(mapCollecteRow),
    error: null,
  };
}

export async function createCollecteRemote(
  values: Omit<CollecteRecord, "id">,
  memberId?: string | null,
): Promise<{ data: CollecteRecord | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) {
    return { data: null, error: new Error("Service indisponible.") };
  }

  let orgIds = {
    chapitre_id: values.orgIds?.chapitre_id || null,
    district_id: values.orgIds?.district_id || null,
    groupe_id: values.orgIds?.groupe_id || null,
  };
  if (!orgIds.chapitre_id || !orgIds.district_id || !orgIds.groupe_id) {
    const resolved = await resolveOrgIds({
      chapitre: values.chapitre,
      district: values.district,
      groupe: values.groupe,
    });
    if (resolved.error) return { data: null, error: resolved.error };
    orgIds = resolved.data;
  }
  if (!orgIds.chapitre_id || !orgIds.district_id || !orgIds.groupe_id) {
    return { data: null, error: new Error("Chapitre, district et groupe sont requis.") };
  }

  const validMemberId = await resolveValidMemberId(memberId, values.membre);

  const payload = {
    type: TYPE_TO_DB[values.type],
    member_id: validMemberId,
    membre_label: values.membre.trim(),
    montant: Number(values.montant),
    date_collecte: values.date,
    statut: STATUT_TO_DB[values.statut] || "en_attente",
    chapitre_id: orgIds.chapitre_id,
    district_id: orgIds.district_id,
    groupe_id: orgIds.groupe_id,
    periode: values.periode.trim(),
    motif: values.motif.trim(),
    reference_recu: (values.referenceRecu || "").trim(),
    note: values.note.trim(),
  };

  const { data, error } = await supabase
    .from("collectes")
    .insert(payload)
    .select("id, numero")
    .single();
  if (error || !data) {
    const message = error?.message || "Création impossible.";
    if (/row-level security|rls/i.test(message)) {
      return {
        data: null,
        error: new Error(
          "Enregistrement refusé (périmètre organisationnel). Vérifiez que le membre appartient à votre chapitre / district / groupe.",
        ),
      };
    }
    return { data: null, error: new Error(message) };
  }

  // Abonnement Vague de Paix : marquer le membre comme abonné dès qu’un paiement VP est saisi.
  if (values.type === "vague-paix" && validMemberId && values.statut !== "Annulé") {
    await supabase
      .from("members")
      .update({ abonnement_vague_paix: true })
      .eq("id", validMemberId);
  }

  const { data: enriched } = await supabase
    .from("v_collectes_enriched")
    .select(
      "id, numero, type, member_id, membre_label, membre_display, montant, date_collecte, statut, chapitre_id, district_id, groupe_id, chapitre_name, district_name, groupe_name, periode, motif, reference_recu, note",
    )
    .eq("id", data.id)
    .maybeSingle();

  if (enriched) {
    return { data: mapCollecteRow(enriched as CollecteEnrichedRow), error: null };
  }

  return {
    data: {
      id: data.id as string,
      numero: (data.numero as string) || "",
      ...values,
    },
    error: null,
  };
}

export async function updateCollecteRemote(
  id: string,
  values: Omit<CollecteRecord, "id">,
  memberId?: string | null,
): Promise<{ data: CollecteRecord | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) {
    return { data: null, error: new Error("Service indisponible.") };
  }

  let orgIds = {
    chapitre_id: values.orgIds?.chapitre_id || null,
    district_id: values.orgIds?.district_id || null,
    groupe_id: values.orgIds?.groupe_id || null,
  };
  if (!orgIds.chapitre_id || !orgIds.district_id || !orgIds.groupe_id) {
    const resolved = await resolveOrgIds({
      chapitre: values.chapitre,
      district: values.district,
      groupe: values.groupe,
    });
    if (resolved.error) return { data: null, error: resolved.error };
    orgIds = resolved.data;
  }
  if (!orgIds.chapitre_id || !orgIds.district_id || !orgIds.groupe_id) {
    return { data: null, error: new Error("Chapitre, district et groupe sont requis.") };
  }

  const validMemberId = await resolveValidMemberId(memberId, values.membre);

  const { error } = await supabase
    .from("collectes")
    .update({
      type: TYPE_TO_DB[values.type],
      member_id: validMemberId,
      membre_label: values.membre.trim(),
      montant: Number(values.montant),
      date_collecte: values.date,
      statut: STATUT_TO_DB[values.statut] || "en_attente",
      chapitre_id: orgIds.chapitre_id,
      district_id: orgIds.district_id,
      groupe_id: orgIds.groupe_id,
      periode: values.periode.trim(),
      motif: values.motif.trim(),
      reference_recu: (values.referenceRecu || "").trim(),
      note: values.note.trim(),
    })
    .eq("id", id);


  if (error) {
    const message = error.message || "Mise à jour impossible.";
    if (/row-level security|rls/i.test(message)) {
      return {
        data: null,
        error: new Error(
          "Modification refusée (périmètre organisationnel). Vérifiez le rattachement chapitre / district / groupe.",
        ),
      };
    }
    return { data: null, error: new Error(message) };
  }

  if (values.type === "vague-paix" && validMemberId && values.statut !== "Annulé") {
    await supabase
      .from("members")
      .update({ abonnement_vague_paix: true })
      .eq("id", validMemberId);
  } else if (values.type === "vague-paix" && validMemberId && values.statut === "Annulé") {
    // Ne retire pas automatiquement l’abonnement : d’autres paiements VP peuvent exister.
  }

  const { data: enriched } = await supabase
    .from("v_collectes_enriched")
    .select(
      "id, numero, type, member_id, membre_label, membre_display, montant, date_collecte, statut, chapitre_id, district_id, groupe_id, chapitre_name, district_name, groupe_name, periode, motif, reference_recu, note",
    )
    .eq("id", id)
    .maybeSingle();

  return {
    data: enriched
      ? mapCollecteRow(enriched as CollecteEnrichedRow)
      : { id, numero: values.numero || "", ...values },
    error: null,
  };
}

export async function deleteCollecteRemote(id: string): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) {
    return { error: new Error("Service indisponible.") };
  }
  const { error } = await supabase.from("collectes").delete().eq("id", id);
  return { error: error ? new Error(error.message) : null };
}
