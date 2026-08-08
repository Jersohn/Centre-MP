/**
 * POST /api/ai-chat
 * Proxy Groq pour les assistants site + dashboard (clé serveur GROQ_API_KEY).
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  return req.body;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Méthode non autorisée. Utilisez POST." });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    sendJson(res, 501, {
      error:
        "Clé Groq absente côté serveur. Ajoutez GROQ_API_KEY dans les variables d’environnement Vercel, puis redéployez.",
    });
    return;
  }

  const body = parseBody(req);
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    sendJson(res, 400, { error: "Messages manquants." });
    return;
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
      sendJson(res, groqResponse.status, {
        error: payload?.error?.message || `Erreur Groq (${groqResponse.status})`,
      });
      return;
    }

    const content = payload?.choices?.[0]?.message?.content?.trim() || "";
    if (!content) {
      sendJson(res, 502, { error: "Réponse vide de Groq." });
      return;
    }

    sendJson(res, 200, { content });
  } catch (error) {
    sendJson(res, 500, {
      error: "Impossible de joindre Groq.",
      details: String(error),
    });
  }
};
