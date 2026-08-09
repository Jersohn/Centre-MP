import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

/**
 * Proxy léger — délègue à la route Vercel si GOSHO_UPSTREAM_URL est défini,
 * sinon renvoie une erreur explicite (le scraping lourd reste côté Vercel).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonResponse(405, { error: "Méthode non autorisée." });
  }

  const upstream = Deno.env.get("GOSHO_UPSTREAM_URL");
  if (!upstream) {
    return jsonResponse(501, {
      error:
        "Configurez GOSHO_UPSTREAM_URL (ex. https://centre-mp-eta.vercel.app/api/gosho-du-jour) ou déployez le scraper ici.",
    });
  }

  try {
    const response = await fetch(upstream, { headers: { Accept: "application/json" } });
    const payload = await response.json();
    return jsonResponse(response.status, payload);
  } catch (error) {
    return jsonResponse(502, {
      error: "Impossible de récupérer le Gosho du jour.",
      details: String(error),
    });
  }
});
