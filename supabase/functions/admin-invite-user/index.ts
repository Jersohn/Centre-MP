import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  canInvite,
  canManageRole,
  normalizeScopeForRole,
  randomPassword,
  type AppRole,
  type CallerProfile,
} from "../_shared/rbac.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

type Body = {
  email?: string;
  full_name?: string;
  role?: AppRole;
  status?: "actif" | "en_attente" | "suspendu";
  chapitre_id?: string | null;
  district_id?: string | null;
  groupe_id?: string | null;
  telephone?: string;
  department?: string;
  /** Mot de passe initial (sinon généré). Pas de confirmation e-mail. */
  password?: string;
  /** true = créer/activer sans lien d’invitation (défaut). */
  skip_email_confirm?: boolean;
  member_id?: string | null;
};

async function findUserIdByEmail(
  service: ReturnType<typeof createServiceClient>,
  email: string,
) {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => (u.email || "").toLowerCase() === email)?.id ?? null;
}

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
      !canInvite(caller.role as AppRole)
    ) {
      return jsonResponse(403, {
        error: "Réservé aux administrateurs, responsables centre ou chapitre actifs.",
      });
    }

    const callerProfile = caller as CallerProfile;
    const body = (await req.json()) as Body;
    const email = (body.email || "").trim().toLowerCase();
    const fullName = (body.full_name || "").trim();
    const role = (body.role || "groupe") as AppRole;
    const skipConfirm = body.skip_email_confirm !== false;
    const status = body.status || (skipConfirm ? "actif" : "en_attente");

    if (!email || !fullName) {
      return jsonResponse(400, { error: "email et full_name sont requis." });
    }
    if (!canManageRole(callerProfile.role, role)) {
      return jsonResponse(403, { error: "Vous ne pouvez pas attribuer ce rôle." });
    }

    let scope;
    try {
      scope = normalizeScopeForRole(
        role,
        {
          chapitre_id: body.chapitre_id,
          district_id: body.district_id,
          groupe_id: body.groupe_id,
        },
        callerProfile,
      );
    } catch (scopeError) {
      return jsonResponse(400, {
        error: scopeError instanceof Error ? scopeError.message : "Périmètre invalide.",
      });
    }

    if (callerProfile.role === "chapitre" && scope.chapitre_id !== callerProfile.chapitre_id) {
      return jsonResponse(403, { error: "Périmètre hors de votre chapitre." });
    }

    let targetId = await findUserIdByEmail(service, email);
    let temporaryPassword: string | undefined;
    let created = false;

    if (!targetId) {
      temporaryPassword = (body.password || "").trim() || randomPassword();
      const { data: createdUser, error: createError } = await service.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !createdUser.user) {
        return jsonResponse(400, {
          error: createError?.message || "Impossible de créer le compte Auth.",
        });
      }
      targetId = createdUser.user.id;
      created = true;
    } else if (body.password?.trim()) {
      const { error: pwdError } = await service.auth.admin.updateUserById(targetId, {
        password: body.password.trim(),
        email_confirm: true,
      });
      if (pwdError) {
        return jsonResponse(400, { error: pwdError.message });
      }
      temporaryPassword = body.password.trim();
    } else {
      // Compte existant : confirmer l’e-mail pour permettre la connexion sans mail.
      await service.auth.admin.updateUserById(targetId, { email_confirm: true });
    }

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .upsert(
        {
          id: targetId,
          email,
          full_name: fullName,
          role,
          status,
          chapitre_id: scope.chapitre_id,
          district_id: scope.district_id,
          groupe_id: scope.groupe_id,
          telephone: body.telephone || "",
          department: body.department || "",
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (profileError) {
      return jsonResponse(400, { error: profileError.message });
    }

    await service.from("user_invitations").insert({
      email,
      full_name: fullName,
      role,
      invited_by: user.id,
      profile_id: profile.id,
      status: status === "actif" ? "accepted" : "pending",
      accepted_at: status === "actif" ? new Date().toISOString() : null,
    });

    if (body.member_id) {
      await service
        .from("members")
        .update({
          responsabilite:
            role === "centre"
              ? "responsable_centre"
              : role === "chapitre"
                ? "responsable_chapitre"
                : role === "district"
                  ? "responsable_district"
                  : "responsable_groupe",
        })
        .eq("id", body.member_id);
    }

    return jsonResponse(200, {
      profile,
      created,
      temporaryPassword,
      emailed: false,
      message: created
        ? "Responsable créé avec un accès actif. Communiquez le mot de passe temporaire pour la première connexion."
        : "Rôle mis à jour — le compte peut se connecter immédiatement.",
    });
  } catch (error) {
    return jsonResponse(500, { error: "Échec de l'invitation.", details: String(error) });
  }
});
