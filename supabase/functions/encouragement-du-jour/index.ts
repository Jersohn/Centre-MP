import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonResponse(405, { error: "Méthode non autorisée." });
  }

  const upstream = Deno.env.get("ENCOURAGEMENT_UPSTREAM_URL");
  if (!upstream) {
    return jsonResponse(501, {
      error:
        "Configurez ENCOURAGEMENT_UPSTREAM_URL (ex. https://centre-mp-eta.vercel.app/api/encouragement-du-jour).",
    });
  }

  try {
    const response = await fetch(upstream, { headers: { Accept: "application/json" } });
    const payload = await response.json();
    return jsonResponse(response.status, payload);
  } catch (error) {
    return jsonResponse(502, {
      error: "Impossible de récupérer l’encouragement du jour.",
      details: String(error),
    });
  }
});
