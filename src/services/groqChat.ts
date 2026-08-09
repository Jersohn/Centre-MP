import type { AiChatMessage, AiChatMode } from "./aiAssistants";
import { getSystemPrompt } from "./aiAssistants";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export type GroqChatRequest = {
  mode: AiChatMode;
  messages: AiChatMessage[];
  context?: string;
};

/** Message affiché à l’utilisateur (jamais de jargon .env / clés). */
export const FRIENDLY_CHAT_ERROR =
  "Je suis temporairement indisponible. Merci de réessayer dans un instant.";

function resolveModel() {
  return import.meta.env.VITE_GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

function clientApiKey() {
  return import.meta.env.VITE_GROQ_API_KEY?.trim() || "";
}

function aiChatEndpoint() {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/api/ai-chat`;
}

/** Convertit n’importe quelle erreur API en chaîne lisible. */
export function stringifyError(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (value instanceof Error) return value.message.trim();
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
    if (typeof obj.error === "string" && obj.error.trim()) return obj.error.trim();
    if (obj.error && typeof obj.error === "object") {
      const nested = stringifyError(obj.error);
      if (nested) return nested;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
}

/** Message utilisateur selon le contexte (prod = neutre). */
export function toUserFacingChatError(error: unknown): string {
  const raw = stringifyError(error);
  if (!raw || raw === "[object Object]") return FRIENDLY_CHAT_ERROR;

  // Ne jamais exposer la config / les clés aux visiteurs
  if (
    /GROQ_API_KEY|\.env|Vercel|clé Groq|gsk_|Authorization|api key/i.test(raw)
  ) {
    return FRIENDLY_CHAT_ERROR;
  }

  if (/network|failed to fetch|load failed|timeout/i.test(raw)) {
    return "La connexion a échoué. Vérifiez votre réseau puis réessayez.";
  }

  if (/rate limit|429|quota|capacity/i.test(raw)) {
    return "L’assistant est très sollicité pour le moment. Réessayez dans quelques instants.";
  }

  // En production, rester générique ; en local, un peu plus précis
  if (import.meta.env.PROD) return FRIENDLY_CHAT_ERROR;

  if (raw.length > 180) return FRIENDLY_CHAT_ERROR;
  return raw;
}

async function callGroqDirect(payload: {
  model: string;
  messages: AiChatMessage[];
  temperature: number;
  max_tokens: number;
}): Promise<string> {
  const key = clientApiKey();
  if (!key) {
    throw new Error(FRIENDLY_CHAT_ERROR);
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const payloadErr = await response.json().catch(() => null);
    throw new Error(stringifyError(payloadErr?.error) || FRIENDLY_CHAT_ERROR);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(FRIENDLY_CHAT_ERROR);
  return content;
}

function buildMessages(input: GroqChatRequest): AiChatMessage[] {
  const system = [
    getSystemPrompt(input.mode),
    input.context ? `\n\n---\nDonnées de contexte:\n${input.context}` : "",
  ].join("");

  return [
    { role: "system", content: system },
    ...input.messages.filter((m) => m.role !== "system"),
  ];
}

async function readApiPayload(
  response: Response
): Promise<{ content?: string; error?: unknown } | null> {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) return null;
  try {
    return (await response.json()) as { content?: string; error?: unknown };
  } catch {
    return null;
  }
}

/** Appelle le proxy `/api/ai-chat` (Vite en local, Vercel en prod). */
export async function sendAiChat(input: GroqChatRequest): Promise<string> {
  const messages = buildMessages(input);
  const body = {
    mode: input.mode,
    model: resolveModel(),
    messages,
    temperature: input.mode === "site" ? 0.75 : 0.35,
    max_tokens: 900,
  };

  try {
    const response = await fetch(aiChatEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    const data = await readApiPayload(response);

    if (response.ok && data?.content?.trim()) {
      return data.content.trim();
    }

    const apiError = stringifyError(data?.error);
    if (apiError) {
      throw new Error(apiError);
    }

    // API absente (HTML SPA / 404) → repli client si clé VITE présente
    if (!data || response.status === 404 || response.status === 501) {
      return callGroqDirect(body);
    }

    throw new Error(FRIENDLY_CHAT_ERROR);
  } catch (error) {
    if (clientApiKey()) {
      try {
        return await callGroqDirect(body);
      } catch {
        /* keep original */
      }
    }
    throw new Error(toUserFacingChatError(error));
  }
}

export function isAiConfigured(): boolean {
  return Boolean(clientApiKey() || import.meta.env.DEV);
}
