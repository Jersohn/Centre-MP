import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { canDeleteUser, type AppRole } from "../_shared/rbac.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

type Body = {
  user_id?: string;
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
      .select("id, role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (
      callerError ||
      !caller ||
      caller.status !== "actif" ||
      (caller.role !== "admin" && caller.role !== "centre")
    ) {
      return jsonResponse(403, {
        error: "Réservé aux administrateurs et responsables centre actifs.",
      });
    }

    const body = (await req.json()) as Body;
    const targetId = (body.user_id || "").trim();
    if (!targetId) {
      return jsonResponse(400, { error: "user_id est requis." });
    }

    const isSelf = targetId === user.id;
    const { data: target, error: targetError } = await service
      .from("profiles")
      .select("id, role, email, full_name")
      .eq("id", targetId)
      .maybeSingle();

    if (targetError || !target) {
      return jsonResponse(404, { error: "Utilisateur introuvable." });
    }

    if (!canDeleteUser(caller.role as AppRole, target.role as AppRole, isSelf)) {
      return jsonResponse(403, {
        error: isSelf
          ? "Vous ne pouvez pas supprimer votre propre compte."
          : "Vous ne pouvez pas supprimer ce compte.",
      });
    }

    // Nettoyage éventuel des invitations liées
    await service.from("user_invites").delete().eq("profile_id", targetId);

    const { error: deleteError } = await service.auth.admin.deleteUser(targetId);
    if (deleteError) {
      return jsonResponse(400, {
        error: deleteError.message || "Suppression impossible.",
      });
    }

    // Sécurité : retirer le profil s’il restait orphelin
    await service.from("profiles").delete().eq("id", targetId);

    return jsonResponse(200, {
      ok: true,
      deleted_user_id: targetId,
      email: target.email,
      full_name: target.full_name,
      message: "Utilisateur supprimé.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return jsonResponse(500, { error: message });
  }
});
