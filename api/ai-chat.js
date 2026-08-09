/**
 * POST /api/ai-chat — Edge Function (ESM-compatible)
 * Proxy Groq ; clé serveur GROQ_API_KEY
 */

export const config = {
  runtime: "edge",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const FRIENDLY =
  "L’assistant est temporairement indisponible. Merci de réessayer dans un instant.";

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function asErrorMessage(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    if (typeof value.message === "string") return value.message.trim();
    if (typeof value.error === "string") return value.error.trim();
    if (value.error && typeof value.error.message === "string") {
      return value.error.message.trim();
    }
  }
  return "";
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "POST") {
    return json(405, { error: "Méthode non autorisée. Utilisez POST." });
  }

  const apiKey = String(
    process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!apiKey) {
    console.error("[ai-chat] GROQ_API_KEY manquante");
    return json(503, { error: FRIENDLY });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Corps de requête invalide." });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (!messages.length) {
    return json(400, { error: "Messages manquants." });
  }

  try {
    const groqResponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || process.env.VITE_GROQ_MODEL || DEFAULT_MODEL,
        messages,
        temperature: typeof body.temperature === "number" ? body.temperature : 0.5,
        max_tokens: typeof body.max_tokens === "number" ? body.max_tokens : 900,
      }),
    });

    const payload = await groqResponse.json().catch(() => ({}));
    if (!groqResponse.ok) {
      console.error(
        "[ai-chat] Groq error",
        groqResponse.status,
        asErrorMessage(payload?.error) || payload
      );
      return json(groqResponse.status === 429 ? 429 : 503, {
        error:
          groqResponse.status === 429
            ? "L’assistant est très sollicité pour le moment. Réessayez dans quelques instants."
            : FRIENDLY,
      });
    }

    const content = payload?.choices?.[0]?.message?.content?.trim() || "";
    if (!content) return json(503, { error: FRIENDLY });

    return json(200, { content });
  } catch (error) {
    console.error("[ai-chat] unexpected", error);
    return json(503, { error: FRIENDLY });
  }
}
