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
    // Message neutre côté client ; le détail reste dans les logs Vercel
    console.error("[ai-chat] GROQ_API_KEY manquante dans les variables d’environnement.");
    sendJson(res, 503, {
      error: "L’assistant est temporairement indisponible. Merci de réessayer dans un instant.",
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
      const detail = asErrorMessage(payload?.error) || asErrorMessage(payload);
      console.error("[ai-chat] Groq error", groqResponse.status, detail || payload);
      sendJson(res, groqResponse.status >= 500 ? 503 : groqResponse.status, {
        error:
          groqResponse.status === 429
            ? "L’assistant est très sollicité pour le moment. Réessayez dans quelques instants."
            : "L’assistant est temporairement indisponible. Merci de réessayer dans un instant.",
      });
      return;
    }

    const content = payload?.choices?.[0]?.message?.content?.trim() || "";
    if (!content) {
      sendJson(res, 503, {
        error: "L’assistant est temporairement indisponible. Merci de réessayer dans un instant.",
      });
      return;
    }

    sendJson(res, 200, { content });
  } catch (error) {
    console.error("[ai-chat] unexpected", error);
    sendJson(res, 503, {
      error: "L’assistant est temporairement indisponible. Merci de réessayer dans un instant.",
    });
  }
};
