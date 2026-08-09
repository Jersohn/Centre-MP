import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const FRIENDLY =
  "L’assistant est temporairement indisponible. Merci de réessayer dans un instant.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Méthode non autorisée. Utilisez POST." });
  }

  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    return jsonResponse(501, {
      error: "Clé Groq absente. Définissez le secret GROQ_API_KEY sur la fonction.",
    });
  }

  try {
    const body = await req.json();
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonResponse(400, { error: "Messages manquants." });
    }

    // Garde basique anti-abus : taille limitée
    if (messages.length > 40) {
      return jsonResponse(400, { error: "Trop de messages dans la conversation." });
    }

    const groqResponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || Deno.env.get("GROQ_MODEL") || DEFAULT_MODEL,
        messages,
        temperature: typeof body.temperature === "number" ? body.temperature : 0.5,
        max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : 900,
      }),
    });

    const payload = await groqResponse.json();
    if (!groqResponse.ok) {
      return jsonResponse(groqResponse.status, {
        error: payload?.error?.message || FRIENDLY,
      });
    }

    const content = payload?.choices?.[0]?.message?.content?.trim() || "";
    return jsonResponse(200, { content });
  } catch (error) {
    return jsonResponse(500, { error: FRIENDLY, details: String(error) });
  }
});
