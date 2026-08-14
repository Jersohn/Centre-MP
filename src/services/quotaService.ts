import { supabase, isSupabaseEnabled } from "./supabaseClient";
import type { PlatformRole } from "../app/roles";

export type QuotaLevel = "centre" | "chapitre" | "district" | "groupe" | "membre";

export type ZaimuCampaign = {
  id: string;
  code: string;
  label: string;
  annee: number;
  montant_centre: number;
  is_active: boolean;
  kind: "ordinaire" | "special";
  date_echeance: string | null;
  published_at: string | null;
  description: string;
  created_at?: string;
};

export type QuotaAssignment = {
  id: string;
  campaign_id: string;
  level: QuotaLevel;
  chapitre_id: string | null;
  district_id: string | null;
  groupe_id: string | null;
  member_id: string | null;
  assigne: number;
  date_echeance: string | null;
  chapitre_name?: string | null;
  district_name?: string | null;
  groupe_name?: string | null;
};

function unavailable<T>(data: T) {
  return { data, error: new Error("Service indisponible.") as Error | null };
}

function mapCampaign(row: Record<string, unknown>): ZaimuCampaign {
  return {
    id: String(row.id),
    code: String(row.code),
    label: String(row.label),
    annee: Number(row.annee),
    montant_centre: Number(row.montant_centre || 0),
    is_active: Boolean(row.is_active),
    kind: (row.kind as "ordinaire" | "special") || "special",
    date_echeance: (row.date_echeance as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    description: String(row.description || ""),
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

const CAMPAIGN_SELECT =
  "id, code, label, annee, montant_centre, is_active, kind, date_echeance, published_at, description, created_at";

function slugCode(label: string, annee: number) {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "campagne";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `ZS-${annee}-${base}-${suffix}`.toUpperCase();
}

export async function listSpecialCampaigns(): Promise<{
  data: ZaimuCampaign[];
  error: Error | null;
}> {
  if (!isSupabaseEnabled() || !supabase) return unavailable([]);

  const { data, error } = await supabase
    .from("zaimu_campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("kind", "special")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: new Error(error.message) };
  return { data: (data || []).map((row) => mapCampaign(row as Record<string, unknown>)), error: null };
}

export async function getSpecialCampaign(id: string): Promise<{
  data: ZaimuCampaign | null;
  error: Error | null;
}> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);

  const { data, error } = await supabase
    .from("zaimu_campaigns")
    .select(CAMPAIGN_SELECT)
    .eq("id", id)
    .eq("kind", "special")
    .maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data ? mapCampaign(data as Record<string, unknown>) : null, error: null };
}

export async function createSpecialCampaign(input: {
  label: string;
  date_echeance: string;
  montant_centre: number;
  description?: string;
}): Promise<{ data: ZaimuCampaign | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);

  const label = input.label.trim();
  if (!label) return { data: null, error: new Error("Le nom de la campagne est requis.") };
  if (!input.date_echeance) {
    return { data: null, error: new Error("La date d’échéance est requise.") };
  }
  const montant = Math.max(0, Number(input.montant_centre) || 0);
  if (montant <= 0) {
    return { data: null, error: new Error("Le montant à couvrir doit être supérieur à 0.") };
  }

  const annee = Number(input.date_echeance.slice(0, 4)) || new Date().getFullYear();
  const code = slugCode(label, annee);

  const { data, error } = await supabase
    .from("zaimu_campaigns")
    .insert({
      code,
      label,
      annee,
      montant_centre: montant,
      is_active: true,
      kind: "special",
      date_echeance: input.date_echeance,
      description: input.description?.trim() || "",
      published_at: null,
    })
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: new Error(error?.message || "Création impossible.") };
  }

  const campaign = mapCampaign(data as Record<string, unknown>);
  const { error: assignError } = await supabase.from("zaimu_quota_assignments").insert({
    campaign_id: campaign.id,
    level: "centre",
    assigne: montant,
    date_echeance: input.date_echeance,
  });
  if (assignError) {
    return { data: null, error: new Error(assignError.message) };
  }

  return { data: campaign, error: null };
}

export async function updateSpecialCampaign(input: {
  id: string;
  label?: string;
  date_echeance?: string;
  montant_centre?: number;
  description?: string;
  is_active?: boolean;
}): Promise<{ data: ZaimuCampaign | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);
  if (!input.id) return { data: null, error: new Error("Identifiant campagne manquant.") };

  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) return { data: null, error: new Error("Le nom de la campagne est requis.") };
    patch.label = label;
  }
  if (input.date_echeance !== undefined) {
    if (!input.date_echeance) {
      return { data: null, error: new Error("La date d’échéance est requise.") };
    }
    patch.date_echeance = input.date_echeance;
    patch.annee = Number(input.date_echeance.slice(0, 4)) || new Date().getFullYear();
  }
  if (input.montant_centre !== undefined) {
    const montant = Math.max(0, Number(input.montant_centre) || 0);
    if (montant <= 0) {
      return { data: null, error: new Error("Le montant à couvrir doit être supérieur à 0.") };
    }
    patch.montant_centre = montant;
  }
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  if (Object.keys(patch).length === 0) {
    return { data: null, error: new Error("Aucune modification à enregistrer.") };
  }

  const { data, error } = await supabase
    .from("zaimu_campaigns")
    .update(patch)
    .eq("id", input.id)
    .eq("kind", "special")
    .select(CAMPAIGN_SELECT)
    .single();

  if (error || !data) {
    return { data: null, error: new Error(error?.message || "Mise à jour impossible.") };
  }

  const campaign = mapCampaign(data as Record<string, unknown>);

  // Aligner la cota centre si montant ou échéance changent
  if (input.montant_centre !== undefined || input.date_echeance !== undefined) {
    const { error: objError } = await setCentreObjective({
      campaignId: campaign.id,
      montant: campaign.montant_centre,
      date_echeance: campaign.date_echeance,
    });
    if (objError) return { data: null, error: objError };
  }

  return { data: campaign, error: null };
}

export async function deleteSpecialCampaign(
  id: string,
): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) {
    return { error: new Error("Service indisponible.") };
  }
  if (!id) return { error: new Error("Identifiant campagne manquant.") };

  const { error } = await supabase
    .from("zaimu_campaigns")
    .delete()
    .eq("id", id)
    .eq("kind", "special");

  return { error: error ? new Error(error.message) : null };
}

export async function listQuotaAssignments(campaignId: string): Promise<{
  data: QuotaAssignment[];
  error: Error | null;
}> {
  if (!isSupabaseEnabled() || !supabase) return unavailable([]);

  const { data, error } = await supabase
    .from("zaimu_quota_assignments")
    .select(
      "id, campaign_id, level, chapitre_id, district_id, groupe_id, member_id, assigne, date_echeance, chapitres(name), districts(name), groupes(name)",
    )
    .eq("campaign_id", campaignId);

  if (error) return { data: [], error: new Error(error.message) };

  return {
    data: ((data || []) as Array<
      QuotaAssignment & {
        chapitres?: { name: string } | null;
        districts?: { name: string } | null;
        groupes?: { name: string } | null;
      }
    >).map((row) => ({
      id: row.id,
      campaign_id: row.campaign_id,
      level: row.level,
      chapitre_id: row.chapitre_id,
      district_id: row.district_id,
      groupe_id: row.groupe_id,
      member_id: row.member_id,
      assigne: Number(row.assigne || 0),
      date_echeance: row.date_echeance,
      chapitre_name: row.chapitres?.name ?? null,
      district_name: row.districts?.name ?? null,
      groupe_name: row.groupes?.name ?? null,
    })),
    error: null,
  };
}

export async function setCentreObjective(input: {
  campaignId: string;
  montant: number;
  date_echeance?: string | null;
}): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return { error: new Error("Service indisponible.") };
  const montant = Math.max(0, Number(input.montant) || 0);

  const patch: Record<string, unknown> = { montant_centre: montant };
  if (input.date_echeance !== undefined) patch.date_echeance = input.date_echeance;

  const { error: campError } = await supabase
    .from("zaimu_campaigns")
    .update(patch)
    .eq("id", input.campaignId);
  if (campError) return { error: new Error(campError.message) };

  const { data: existing } = await supabase
    .from("zaimu_quota_assignments")
    .select("id")
    .eq("campaign_id", input.campaignId)
    .eq("level", "centre")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("zaimu_quota_assignments")
      .update({
        assigne: montant,
        date_echeance: input.date_echeance ?? null,
      })
      .eq("id", existing.id);
    return { error: error ? new Error(error.message) : null };
  }

  const { error } = await supabase.from("zaimu_quota_assignments").insert({
    campaign_id: input.campaignId,
    level: "centre",
    assigne: montant,
    date_echeance: input.date_echeance ?? null,
  });
  return { error: error ? new Error(error.message) : null };
}

export async function upsertChildQuotas(input: {
  campaignId: string;
  level: "chapitre" | "district" | "groupe" | "membre";
  rows: Array<{
    chapitre_id: string | null;
    district_id: string | null;
    groupe_id: string | null;
    member_id?: string | null;
    assigne: number;
    date_echeance?: string | null;
  }>;
  /** Si true et level=chapitre : marque la campagne publiée (visibilité responsables). */
  publish?: boolean;
}): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return { error: new Error("Service indisponible.") };

  for (const row of input.rows) {
    const assigne = Math.max(0, Number(row.assigne) || 0);
    let query = supabase
      .from("zaimu_quota_assignments")
      .select("id")
      .eq("campaign_id", input.campaignId)
      .eq("level", input.level);

    if (input.level === "chapitre") query = query.eq("chapitre_id", row.chapitre_id!);
    if (input.level === "district") {
      query = query.eq("chapitre_id", row.chapitre_id!).eq("district_id", row.district_id!);
    }
    if (input.level === "groupe") {
      query = query
        .eq("chapitre_id", row.chapitre_id!)
        .eq("district_id", row.district_id!)
        .eq("groupe_id", row.groupe_id!);
    }
    if (input.level === "membre") {
      query = query.eq("member_id", row.member_id!);
    }

    const { data: existing, error: findError } = await query.maybeSingle();
    if (findError) return { error: new Error(findError.message) };

    const payload = {
      assigne,
      date_echeance: row.date_echeance || null,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("zaimu_quota_assignments")
        .update(payload)
        .eq("id", existing.id);
      if (error) return { error: new Error(error.message) };
    } else {
      const { error } = await supabase.from("zaimu_quota_assignments").insert({
        campaign_id: input.campaignId,
        level: input.level,
        chapitre_id: row.chapitre_id,
        district_id: row.district_id,
        groupe_id: row.groupe_id,
        member_id: input.level === "membre" ? row.member_id : null,
        ...payload,
      });
      if (error) return { error: new Error(error.message) };
    }
  }

  if (input.publish && input.level === "chapitre") {
    const { error } = await supabase
      .from("zaimu_campaigns")
      .update({ published_at: new Date().toISOString(), is_active: true })
      .eq("id", input.campaignId);
    if (error) return { error: new Error(error.message) };
  }

  return { error: null };
}

/** Niveau enfant éditable selon le rôle (zaimu spécial). */
export function editableChildLevel(
  role: PlatformRole,
): "chapitre" | "district" | "groupe" | "membre" | null {
  if (role === "admin" || role === "centre") return "chapitre";
  if (role === "chapitre") return "district";
  if (role === "district") return "groupe";
  if (role === "groupe") return "membre";
  return null;
}

export type AssignedCampaignCard = {
  campaign: ZaimuCampaign;
  level: QuotaLevel;
  assigne: number;
  date_echeance: string | null;
  orgLabel: string;
};

/** Campagnes reçues pour le profil courant (après publication / répartition amont). */
export async function listMyAssignedSpecialCampaigns(input: {
  role: PlatformRole;
  chapitre_id: string | null;
  district_id: string | null;
  groupe_id: string | null;
  chapitre_name?: string | null;
  district_name?: string | null;
  groupe_name?: string | null;
}): Promise<{ data: AssignedCampaignCard[]; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable([]);

  if (input.role === "admin" || input.role === "centre") {
    const { data, error } = await listSpecialCampaigns();
    if (error) return { data: [], error };
    return {
      data: data.map((campaign) => ({
        campaign,
        level: "centre" as const,
        assigne: campaign.montant_centre,
        date_echeance: campaign.date_echeance,
        orgLabel: "Centre",
      })),
      error: null,
    };
  }

  const level: QuotaLevel | null =
    input.role === "chapitre"
      ? "chapitre"
      : input.role === "district"
        ? "district"
        : input.role === "groupe"
          ? "groupe"
          : null;
  if (!level) return { data: [], error: null };

  let query = supabase
    .from("zaimu_quota_assignments")
    .select(
      "assigne, date_echeance, level, chapitre_id, district_id, groupe_id, chapitres(name), districts(name), groupes(name), zaimu_campaigns!inner(id, code, label, annee, montant_centre, is_active, kind, date_echeance, published_at, description, created_at)",
    )
    .eq("level", level)
    .eq("zaimu_campaigns.kind", "special")
    .not("zaimu_campaigns.published_at", "is", null);

  if (level === "chapitre" && input.chapitre_id) {
    query = query.eq("chapitre_id", input.chapitre_id);
  } else if (level === "district" && input.district_id) {
    query = query.eq("district_id", input.district_id);
  } else if (level === "groupe" && input.groupe_id) {
    query = query.eq("groupe_id", input.groupe_id);
  } else if (
    !(
      (level === "chapitre" && input.chapitre_name) ||
      (level === "district" && input.district_name) ||
      (level === "groupe" && input.groupe_name)
    )
  ) {
    return { data: [], error: null };
  }

  const { data, error } = await query;
  if (error) return { data: [], error: new Error(error.message) };

  type Row = {
    assigne: number;
    date_echeance: string | null;
    level: QuotaLevel;
    chapitres?: { name: string } | null;
    districts?: { name: string } | null;
    groupes?: { name: string } | null;
    zaimu_campaigns: Record<string, unknown> | Record<string, unknown>[] | null;
  };

  const norm = (value?: string | null) => (value || "").trim().toLowerCase();
  const wantedChapitre = norm(input.chapitre_name);
  const wantedDistrict = norm(input.district_name);
  const wantedGroupe = norm(input.groupe_name);

  return {
    data: ((data || []) as Row[])
      .filter((row) => {
        if (input.chapitre_id || input.district_id || input.groupe_id) return true;
        if (level === "chapitre") return Boolean(wantedChapitre) && norm(row.chapitres?.name) === wantedChapitre;
        if (level === "district") return Boolean(wantedDistrict) && norm(row.districts?.name) === wantedDistrict;
        if (level === "groupe") return Boolean(wantedGroupe) && norm(row.groupes?.name) === wantedGroupe;
        return false;
      })
      .map((row) => {
        const campRaw = Array.isArray(row.zaimu_campaigns)
          ? row.zaimu_campaigns[0]
          : row.zaimu_campaigns;
        if (!campRaw) return null;
        const campaign = mapCampaign(campRaw);
        const orgLabel =
          row.groupes?.name || row.districts?.name || row.chapitres?.name || "Périmètre";
        return {
          campaign,
          level: row.level,
          assigne: Number(row.assigne || 0),
          date_echeance: row.date_echeance || campaign.date_echeance,
          orgLabel,
        } satisfies AssignedCampaignCard;
      })
      .filter((item): item is AssignedCampaignCard => Boolean(item) && item.assigne > 0),
    error: null,
  };
}
