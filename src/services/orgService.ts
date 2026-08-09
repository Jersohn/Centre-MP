import { supabase, isSupabaseEnabled } from "./supabaseClient";
import type { ChapitreRow, DistrictRow, GroupeRow } from "../types/supabase";

export type OrgIds = {
  chapitre_id: string | null;
  district_id: string | null;
  groupe_id: string | null;
};

export function slugifyOrgName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function unavailable<T>(empty: T): { data: T; error: Error } {
  return { data: empty, error: new Error("Service indisponible.") };
}

function mapError(error: { message?: string } | null, fallback: string) {
  if (!error?.message) return new Error(fallback);
  if (/duplicate key|unique constraint/i.test(error.message)) {
    return new Error("Ce nom existe déjà dans ce périmètre.");
  }
  if (/foreign key|restrict/i.test(error.message)) {
    return new Error("Suppression impossible : des membres ou collectes y sont encore rattachés.");
  }
  return new Error(error.message || fallback);
}

export async function resolveOrgIds(input: {
  chapitre?: string;
  district?: string;
  groupe?: string;
}): Promise<{ data: OrgIds; error: Error | null }> {
  const empty: OrgIds = { chapitre_id: null, district_id: null, groupe_id: null };
  if (!isSupabaseEnabled() || !supabase) {
    return { data: empty, error: new Error("Service indisponible.") };
  }

  let chapitre_id: string | null = null;
  let district_id: string | null = null;
  let groupe_id: string | null = null;

  if (input.chapitre?.trim()) {
    const name = input.chapitre.includes("–")
      ? input.chapitre.split("–")[1]?.trim() || input.chapitre
      : input.chapitre.trim();
    const { data, error } = await supabase
      .from("chapitres")
      .select("id, name")
      .ilike("name", name)
      .maybeSingle();
    if (error) return { data: empty, error };
    chapitre_id = data?.id ?? null;
  }

  if (input.district?.trim() && chapitre_id) {
    const { data, error } = await supabase
      .from("districts")
      .select("id, name")
      .eq("chapitre_id", chapitre_id)
      .ilike("name", input.district.trim())
      .maybeSingle();
    if (error) return { data: empty, error };
    district_id = data?.id ?? null;
  }

  if (input.groupe?.trim() && district_id) {
    const { data, error } = await supabase
      .from("groupes")
      .select("id, name")
      .eq("district_id", district_id)
      .ilike("name", input.groupe.trim())
      .maybeSingle();
    if (error) return { data: empty, error };
    groupe_id = data?.id ?? null;
  }

  return { data: { chapitre_id, district_id, groupe_id }, error: null };
}

export async function listChapitres(): Promise<{ data: ChapitreRow[]; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable([]);

  const { data, error } = await supabase
    .from("chapitres")
    .select("id, slug, name, description, sort_order, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { data: [], error: mapError(error, "Impossible de charger les chapitres.") };

  const chapitres = (data || []) as ChapitreRow[];
  const [{ data: districts }, { data: tree }] = await Promise.all([
    supabase.from("districts").select("id, chapitre_id"),
    supabase.from("v_org_tree").select("chapitre_id, groupe_id"),
  ]);

  const districtCount = new Map<string, number>();
  for (const row of districts || []) {
    districtCount.set(row.chapitre_id, (districtCount.get(row.chapitre_id) || 0) + 1);
  }
  const groupeCount = new Map<string, number>();
  for (const row of tree || []) {
    if (!row.chapitre_id || !row.groupe_id) continue;
    groupeCount.set(row.chapitre_id, (groupeCount.get(row.chapitre_id) || 0) + 1);
  }

  return {
    data: chapitres.map((item) => ({
      ...item,
      districts_count: districtCount.get(item.id) || 0,
      groupes_count: groupeCount.get(item.id) || 0,
    })),
    error: null,
  };
}

export async function createChapitre(input: {
  name: string;
  description?: string;
  sort_order?: number;
}): Promise<{ data: ChapitreRow | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);
  const name = input.name.trim();
  if (!name) return { data: null, error: new Error("Le nom du chapitre est requis.") };

  const { data, error } = await supabase
    .from("chapitres")
    .insert({
      name,
      slug: slugifyOrgName(name),
      description: input.description?.trim() || "",
      sort_order: input.sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) return { data: null, error: mapError(error, "Création du chapitre impossible.") };
  return { data: data as ChapitreRow, error: null };
}

export async function updateChapitre(
  id: string,
  input: { name?: string; description?: string; sort_order?: number },
): Promise<{ data: ChapitreRow | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { data: null, error: new Error("Le nom du chapitre est requis.") };
    patch.name = name;
    patch.slug = slugifyOrgName(name);
  }
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("chapitres")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return { data: null, error: mapError(error, "Mise à jour du chapitre impossible.") };
  return { data: data as ChapitreRow, error: null };
}

export async function deleteChapitre(id: string): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return { error: new Error("Service indisponible.") };
  const { error } = await supabase.from("chapitres").delete().eq("id", id);
  return { error: error ? mapError(error, "Suppression du chapitre impossible.") : null };
}

export async function listDistricts(): Promise<{ data: DistrictRow[]; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable([]);

  const { data, error } = await supabase
    .from("districts")
    .select("id, chapitre_id, slug, name, sort_order, created_at, updated_at, chapitres(name)")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { data: [], error: mapError(error, "Impossible de charger les districts.") };

  const { data: groupes } = await supabase.from("groupes").select("id, district_id");
  const groupeCount = new Map<string, number>();
  for (const row of groupes || []) {
    groupeCount.set(row.district_id, (groupeCount.get(row.district_id) || 0) + 1);
  }

  return {
    data: ((data || []) as Array<DistrictRow & { chapitres?: { name: string } | null }>).map((row) => ({
      id: row.id,
      chapitre_id: row.chapitre_id,
      slug: row.slug,
      name: row.name,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
      chapitre_name: row.chapitres?.name ?? null,
      groupes_count: groupeCount.get(row.id) || 0,
    })),
    error: null,
  };
}

export async function createDistrict(input: {
  name: string;
  chapitre_id: string;
  sort_order?: number;
}): Promise<{ data: DistrictRow | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);
  const name = input.name.trim();
  if (!name) return { data: null, error: new Error("Le nom du district est requis.") };
  if (!input.chapitre_id) return { data: null, error: new Error("Le chapitre est requis.") };

  const { data, error } = await supabase
    .from("districts")
    .insert({
      name,
      slug: slugifyOrgName(name),
      chapitre_id: input.chapitre_id,
      sort_order: input.sort_order ?? 0,
    })
    .select("id, chapitre_id, slug, name, sort_order, created_at, updated_at, chapitres(name)")
    .single();

  if (error) return { data: null, error: mapError(error, "Création du district impossible.") };
  const row = data as DistrictRow & { chapitres?: { name: string } | null };
  return {
    data: {
      ...row,
      chapitre_name: row.chapitres?.name ?? null,
      groupes_count: 0,
    },
    error: null,
  };
}

export async function updateDistrict(
  id: string,
  input: { name?: string; chapitre_id?: string; sort_order?: number },
): Promise<{ data: DistrictRow | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { data: null, error: new Error("Le nom du district est requis.") };
    patch.name = name;
    patch.slug = slugifyOrgName(name);
  }
  if (input.chapitre_id !== undefined) patch.chapitre_id = input.chapitre_id;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("districts")
    .update(patch)
    .eq("id", id)
    .select("id, chapitre_id, slug, name, sort_order, created_at, updated_at, chapitres(name)")
    .single();

  if (error) return { data: null, error: mapError(error, "Mise à jour du district impossible.") };
  const row = data as DistrictRow & { chapitres?: { name: string } | null };
  return {
    data: {
      ...row,
      chapitre_name: row.chapitres?.name ?? null,
    },
    error: null,
  };
}

export async function deleteDistrict(id: string): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return { error: new Error("Service indisponible.") };
  const { error } = await supabase.from("districts").delete().eq("id", id);
  return { error: error ? mapError(error, "Suppression du district impossible.") : null };
}

export async function listGroupes(): Promise<{ data: GroupeRow[]; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable([]);

  const { data, error } = await supabase
    .from("v_org_tree")
    .select("groupe_id, groupe_slug, groupe_name, district_id, district_name, chapitre_id, chapitre_name")
    .order("chapitre_name", { ascending: true })
    .order("district_name", { ascending: true })
    .order("groupe_name", { ascending: true });

  if (error) {
    // Fallback tables si la vue n'est pas accessible
    const { data: raw, error: rawError } = await supabase
      .from("groupes")
      .select("id, district_id, slug, name, sort_order, created_at, updated_at, districts(name, chapitre_id, chapitres(name))")
      .order("name", { ascending: true });
    if (rawError) return { data: [], error: mapError(rawError, "Impossible de charger les groupes.") };

    type Nested = {
      id: string;
      district_id: string;
      slug: string;
      name: string;
      sort_order: number;
      created_at: string;
      updated_at: string;
      districts?: {
        name: string;
        chapitre_id: string;
        chapitres?: { name: string } | null;
      } | null;
    };

    return {
      data: ((raw || []) as Nested[]).map((row) => ({
        id: row.id,
        district_id: row.district_id,
        slug: row.slug,
        name: row.name,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        district_name: row.districts?.name ?? null,
        chapitre_id: row.districts?.chapitre_id ?? null,
        chapitre_name: row.districts?.chapitres?.name ?? null,
      })),
      error: null,
    };
  }

  type TreeRow = {
    groupe_id: string;
    groupe_slug: string;
    groupe_name: string;
    district_id: string;
    district_name: string;
    chapitre_id: string;
    chapitre_name: string;
  };

  const { data: meta } = await supabase
    .from("groupes")
    .select("id, sort_order, created_at, updated_at");
  const metaById = new Map((meta || []).map((row) => [row.id, row]));

  return {
    data: ((data || []) as TreeRow[])
      .filter((row) => row.groupe_id)
      .map((row) => {
        const extra = metaById.get(row.groupe_id);
        return {
          id: row.groupe_id,
          district_id: row.district_id,
          slug: row.groupe_slug,
          name: row.groupe_name,
          sort_order: extra?.sort_order ?? 0,
          created_at: extra?.created_at ?? "",
          updated_at: extra?.updated_at ?? "",
          district_name: row.district_name,
          chapitre_id: row.chapitre_id,
          chapitre_name: row.chapitre_name,
        };
      }),
    error: null,
  };
}

export async function createGroupe(input: {
  name: string;
  district_id: string;
  sort_order?: number;
}): Promise<{ data: GroupeRow | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);
  const name = input.name.trim();
  if (!name) return { data: null, error: new Error("Le nom du groupe est requis.") };
  if (!input.district_id) return { data: null, error: new Error("Le district est requis.") };

  const { data, error } = await supabase
    .from("groupes")
    .insert({
      name,
      slug: slugifyOrgName(name),
      district_id: input.district_id,
      sort_order: input.sort_order ?? 0,
    })
    .select("id, district_id, slug, name, sort_order, created_at, updated_at")
    .single();

  if (error) return { data: null, error: mapError(error, "Création du groupe impossible.") };

  const { data: district } = await supabase
    .from("districts")
    .select("id, name, chapitre_id, chapitres(name)")
    .eq("id", input.district_id)
    .maybeSingle();

  const nested = district as {
    name?: string;
    chapitre_id?: string;
    chapitres?: { name: string } | null;
  } | null;

  return {
    data: {
      ...(data as GroupeRow),
      district_name: nested?.name ?? null,
      chapitre_id: nested?.chapitre_id ?? null,
      chapitre_name: nested?.chapitres?.name ?? null,
    },
    error: null,
  };
}

export async function updateGroupe(
  id: string,
  input: { name?: string; district_id?: string; sort_order?: number },
): Promise<{ data: GroupeRow | null; error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return unavailable(null);
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { data: null, error: new Error("Le nom du groupe est requis.") };
    patch.name = name;
    patch.slug = slugifyOrgName(name);
  }
  if (input.district_id !== undefined) patch.district_id = input.district_id;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from("groupes")
    .update(patch)
    .eq("id", id)
    .select("id, district_id, slug, name, sort_order, created_at, updated_at")
    .single();

  if (error) return { data: null, error: mapError(error, "Mise à jour du groupe impossible.") };

  const districtId = (data as GroupeRow).district_id;
  const { data: district } = await supabase
    .from("districts")
    .select("id, name, chapitre_id, chapitres(name)")
    .eq("id", districtId)
    .maybeSingle();

  const nested = district as {
    name?: string;
    chapitre_id?: string;
    chapitres?: { name: string } | null;
  } | null;

  return {
    data: {
      ...(data as GroupeRow),
      district_name: nested?.name ?? null,
      chapitre_id: nested?.chapitre_id ?? null,
      chapitre_name: nested?.chapitres?.name ?? null,
    },
    error: null,
  };
}

export async function deleteGroupe(id: string): Promise<{ error: Error | null }> {
  if (!isSupabaseEnabled() || !supabase) return { error: new Error("Service indisponible.") };
  const { error } = await supabase.from("groupes").delete().eq("id", id);
  return { error: error ? mapError(error, "Suppression du groupe impossible.") : null };
}
