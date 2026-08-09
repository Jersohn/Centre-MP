import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  canManageOrgScope,
  canManageRole,
  canUpsertProfile,
  normalizeScopeForRole,
  type AppRole,
  type CallerProfile,
} from "../_shared/rbac.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

type Body = {
  user_id?: string;
  email?: string;
  full_name?: string;
  role?: AppRole;
  status?: "actif" | "en_attente" | "suspendu";
  chapitre_id?: string | null;
  district_id?: string | null;
  groupe_id?: string | null;
  telephone?: string;
  department?: string;
  quartier?: string;
  bio?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Méthode non autorisée." });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const userClient = createUserClient(authHeader);
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse(401, { error: "Authentification requise." });
    }

    const service = createServiceClient();
    const { data: caller, error: callerError } = await service
      .from("profiles")
      .select("id, role, status, chapitre_id, district_id, groupe_id")
      .eq("id", user.id)
      .maybeSingle();

    if (
      callerError ||
      !caller ||
      caller.status !== "actif" ||
      !canUpsertProfile(caller.role as AppRole)
    ) {
      return jsonResponse(403, {
        error: "Réservé aux responsables hiérarchiques actifs (admin, centre, chapitre, district).",
      });
    }

    const callerProfile = caller as CallerProfile;
    const body = (await req.json()) as Body;
    if (!body.user_id && !body.email) {
      return jsonResponse(400, { error: "user_id ou email requis." });
    }

    let targetId = body.user_id;
    if (!targetId && body.email) {
      const { data: listed, error: listError } = await service.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listError) {
        return jsonResponse(500, { error: listError.message });
      }
      const found = listed.users.find(
        (u) => (u.email || "").toLowerCase() === body.email!.toLowerCase(),
      );
      if (!found) {
        return jsonResponse(404, { error: "Utilisateur Auth introuvable pour cet e-mail." });
      }
      targetId = found.id;
    }

    const { data: existing } = await service
      .from("profiles")
      .select("role, chapitre_id, district_id, groupe_id, status")
      .eq("id", targetId!)
      .maybeSingle();

    if (
      existing?.role === "admin" &&
      callerProfile.role !== "admin"
    ) {
      return jsonResponse(403, { error: "Impossible de modifier un administrateur." });
    }

    const isSelf = targetId === callerProfile.id;
    const nextRole = (body.role || existing?.role || "groupe") as AppRole;

    if (body.role && body.role !== existing?.role) {
      if (isSelf) {
        return jsonResponse(403, { error: "Vous ne pouvez pas modifier votre propre rôle." });
      }
      if (!canManageRole(callerProfile.role, body.role)) {
        return jsonResponse(403, { error: "Vous ne pouvez pas attribuer ce rôle." });
      }
    }

    const scopeTouched =
      body.chapitre_id !== undefined ||
      body.district_id !== undefined ||
      body.groupe_id !== undefined;

    if (scopeTouched && !canManageOrgScope(callerProfile.role, nextRole, isSelf)) {
      return jsonResponse(403, {
        error: isSelf
          ? "Seul un responsable centre (ou admin) peut modifier son propre rattachement."
          : "Seul le responsable hiérarchique peut modifier le chapitre / district / groupe.",
      });
    }

    if (body.status !== undefined && isSelf) {
      return jsonResponse(403, { error: "Vous ne pouvez pas modifier votre propre statut." });
    }

    let scope = {
      chapitre_id: body.chapitre_id !== undefined ? body.chapitre_id : existing?.chapitre_id,
      district_id: body.district_id !== undefined ? body.district_id : existing?.district_id,
      groupe_id: body.groupe_id !== undefined ? body.groupe_id : existing?.groupe_id,
    };

    try {
      scope = normalizeScopeForRole(nextRole, scope, callerProfile);
    } catch (scopeError) {
      return jsonResponse(400, {
        error: scopeError instanceof Error ? scopeError.message : "Périmètre invalide.",
      });
    }

    if (callerProfile.role === "chapitre") {
      if (scope.chapitre_id !== callerProfile.chapitre_id) {
        return jsonResponse(403, { error: "Périmètre hors de votre chapitre." });
      }
      if (existing?.chapitre_id && existing.chapitre_id !== callerProfile.chapitre_id) {
        return jsonResponse(403, { error: "Ce profil n’appartient pas à votre chapitre." });
      }
    }

    if (callerProfile.role === "district") {
      if (!callerProfile.chapitre_id || !callerProfile.district_id) {
        return jsonResponse(403, { error: "Votre profil district n’a pas de périmètre rattaché." });
      }
      if (
        scope.chapitre_id !== callerProfile.chapitre_id ||
        scope.district_id !== callerProfile.district_id
      ) {
        return jsonResponse(403, { error: "Périmètre hors de votre district." });
      }
      if (
        existing &&
        (existing.chapitre_id !== callerProfile.chapitre_id ||
          existing.district_id !== callerProfile.district_id)
      ) {
        return jsonResponse(403, { error: "Ce profil n’appartient pas à votre district." });
      }
    }

    const patch: Record<string, unknown> = {
      email: body.email,
      full_name: body.full_name,
      role: body.role,
      status: body.status,
      telephone: body.telephone,
      department: body.department,
      quartier: body.quartier,
      bio: body.bio,
    };

    // Toujours écrire le périmètre normalisé quand le body touche le scope,
    // ou quand le rôle change (cohérence contrainte profiles_scope_coherence).
    if (scopeTouched || body.role !== undefined) {
      patch.chapitre_id = scope.chapitre_id;
      patch.district_id = scope.district_id;
      patch.groupe_id = scope.groupe_id;
    }

    const cleaned = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );

    // UPDATE ciblé (évite les effets de bord d’un upsert partiel).
    const { data, error } = await service
      .from("profiles")
      .update(cleaned)
      .eq("id", targetId!)
      .select(
        "id, email, full_name, role, status, telephone, department, quartier, bio, photo_url, chapitre_id, district_id, groupe_id, created_at, updated_at",
      )
      .maybeSingle();

    if (error) {
      return jsonResponse(400, { error: error.message });
    }
    if (!data) {
      return jsonResponse(404, { error: "Profil introuvable." });
    }

    const [{ data: chapitre }, { data: district }, { data: groupe }] = await Promise.all([
      data.chapitre_id
        ? service.from("chapitres").select("name").eq("id", data.chapitre_id).maybeSingle()
        : Promise.resolve({ data: null as { name: string } | null }),
      data.district_id
        ? service.from("districts").select("name").eq("id", data.district_id).maybeSingle()
        : Promise.resolve({ data: null as { name: string } | null }),
      data.groupe_id
        ? service.from("groupes").select("name").eq("id", data.groupe_id).maybeSingle()
        : Promise.resolve({ data: null as { name: string } | null }),
    ]);

    return jsonResponse(200, {
      profile: {
        ...data,
        chapitre_name: chapitre?.name ?? null,
        district_name: district?.name ?? null,
        groupe_name: groupe?.name ?? null,
      },
    });
  } catch (error) {
    return jsonResponse(500, { error: "Échec de mise à jour du profil.", details: String(error) });
  }
});
