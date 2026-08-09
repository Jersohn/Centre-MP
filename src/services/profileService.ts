import { supabase, isSupabaseEnabled } from "./supabaseClient";
import type { AppRole, ProfileRow, ProfileStatus } from "../types/supabase";

export type InvitePayload = {
  email: string;
  full_name: string;
  role: AppRole;
  status?: ProfileStatus;
  chapitre_id?: string | null;
  district_id?: string | null;
  groupe_id?: string | null;
  telephone?: string;
  department?: string;
  password?: string;
  skip_email_confirm?: boolean;
  member_id?: string | null;
};

export function hasRemoteProfiles() {
  return isSupabaseEnabled();
}

export async function fetchMyProfile() {
  if (!supabase) return { data: null, error: new Error("Service indisponible.") };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { data: null, error: userError || new Error("Session expirée. Reconnectez-vous.") };
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("my_profile");
  const rpcRow = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as ProfileRow | null;
  if (!rpcError && rpcRow) {
    return { data: rpcRow, error: null };
  }

  // Fallback si le RPC renvoie vide / erreur (ex. session fraîche)
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return { data: null, error: rpcError || error };
  if (!data) {
    return {
      data: null,
      error: rpcError || new Error("Profil introuvable pour ce compte."),
    };
  }
  return { data: data as ProfileRow, error: null };
}

export async function listProfiles() {
  if (!supabase) return { data: [] as ProfileRow[], error: new Error("Service indisponible.") };

  // RPC security definer : admin voit tous les comptes ; centre/chapitre sans les admins
  const { data: rpcData, error: rpcError } = await supabase.rpc("list_managed_profiles");
  if (!rpcError && Array.isArray(rpcData)) {
    return { data: rpcData as ProfileRow[], error: null };
  }

  // Fallback direct (RLS profiles_select_self_or_admin)
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return {
      data: [] as ProfileRow[],
      error: rpcError || error,
    };
  }
  return { data: (data as ProfileRow[]) || [], error: null };
}

function cleanOrgId(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateProfileRemote(payload: {
  user_id: string;
  role?: AppRole;
  status?: ProfileStatus;
  full_name?: string;
  chapitre_id?: string | null;
  district_id?: string | null;
  groupe_id?: string | null;
  telephone?: string;
  department?: string;
}) {
  if (!supabase) return { data: null, error: new Error("Service indisponible.") };

  const body = {
    ...payload,
    chapitre_id: cleanOrgId(payload.chapitre_id),
    district_id: cleanOrgId(payload.district_id),
    groupe_id: cleanOrgId(payload.groupe_id),
  };

  const { data, error } = await supabase.functions.invoke("admin-upsert-profile", {
    body,
  });
  if (!error && !data?.error && data?.profile) {
    return { data: data.profile as ProfileRow, error: null };
  }

  // Fallback RLS (admin/centre/chapitre) si l’edge function échoue ou est obsolète.
  const scopeTouched =
    payload.chapitre_id !== undefined ||
    payload.district_id !== undefined ||
    payload.groupe_id !== undefined;
  const patch: Record<string, unknown> = {};
  if (payload.role !== undefined) patch.role = payload.role;
  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.full_name !== undefined) patch.full_name = payload.full_name;
  if (payload.telephone !== undefined) patch.telephone = payload.telephone;
  if (payload.department !== undefined) patch.department = payload.department;
  if (scopeTouched) {
    patch.chapitre_id = body.chapitre_id ?? null;
    patch.district_id = body.district_id ?? null;
    patch.groupe_id = body.groupe_id ?? null;
  }
  if (Object.keys(patch).length === 0) {
    return {
      data: null,
      error: error || (data?.error ? new Error(data.error) : new Error("Aucune modification.")),
    };
  }

  const { data: row, error: updateError } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", payload.user_id)
    .select(
      "id, email, full_name, role, status, telephone, department, quartier, bio, photo_url, chapitre_id, district_id, groupe_id, created_at, updated_at",
    )
    .maybeSingle();

  if (updateError || !row) {
    return {
      data: null,
      error:
        updateError ||
        error ||
        (data?.error ? new Error(data.error) : new Error("Impossible d’enregistrer le profil.")),
    };
  }

  const [{ data: chapitre }, { data: district }, { data: groupe }] = await Promise.all([
    row.chapitre_id
      ? supabase.from("chapitres").select("name").eq("id", row.chapitre_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    row.district_id
      ? supabase.from("districts").select("name").eq("id", row.district_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
    row.groupe_id
      ? supabase.from("groupes").select("name").eq("id", row.groupe_id).maybeSingle()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  return {
    data: {
      ...(row as ProfileRow),
      chapitre_name: chapitre?.name ?? null,
      district_name: district?.name ?? null,
      groupe_name: groupe?.name ?? null,
    },
    error: null,
  };
}

export async function inviteUserRemote(payload: InvitePayload) {
  if (!supabase) return { data: null, error: new Error("Service indisponible.") };
  const { data, error } = await supabase.functions.invoke("admin-invite-user", {
    body: payload,
  });
  if (error) return { data: null, error };
  if (data?.error) return { data: null, error: new Error(data.error) };
  return {
    data: data as {
      profile: ProfileRow;
      inviteUrl?: string;
      temporaryPassword?: string;
      created?: boolean;
      emailed?: boolean;
      message?: string;
    },
    error: null,
  };
}

export async function deleteUserRemote(userId: string) {
  if (!supabase) return { data: null, error: new Error("Service indisponible.") };
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { user_id: userId },
  });
  if (error) return { data: null, error };
  if (data?.error) return { data: null, error: new Error(data.error) };
  return {
    data: data as {
      ok: boolean;
      deleted_user_id: string;
      email?: string;
      full_name?: string;
      message?: string;
    },
    error: null,
  };
}

export async function fetchRolePermissions() {
  if (!supabase) return { data: null, error: new Error("Service indisponible.") };
  const { data, error } = await supabase.from("role_module_access").select("*");
  return { data, error };
}

export async function saveRolePermissions(
  rows: Array<{ role: AppRole; module_key: string; allowed: boolean }>,
) {
  if (!supabase) return { error: new Error("Service indisponible.") };
  const { error } = await supabase.from("role_module_access").upsert(rows, {
    onConflict: "role,module_key",
  });
  return { error };
}
