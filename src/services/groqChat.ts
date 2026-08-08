import type { AiChatMessage, AiChatMode } from "./aiAssistants";
import { getSystemPrompt } from "./aiAssistants";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export type GroqChatRequest = {
  mode: AiChatMode;
  messages: AiChatMessage[];
  context?: string;
};

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

async function callGroqDirect(payload: {
  model: string;
  messages: AiChatMessage[];
  temperature: number;
  max_tokens: number;
}): Promise<string> {
  const key = clientApiKey();
  if (!key) {
    throw new Error(
      "Clé Groq manquante. En production, définissez GROQ_API_KEY sur Vercel. En local, ajoutez-la dans Centre-MP/.env."
    );
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
    throw new Error(`Impossible de joindre Groq (${response.status}).`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Réponse vide de l’assistant.");
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

async function readApiPayload(response: Response): Promise<{ content?: string; error?: string } | null> {
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) return null;
  try {
    return (await response.json()) as { content?: string; error?: string };
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

    if (data?.error) {
      throw new Error(data.error);
    }

    // API absente (HTML SPA / 404) → repli client si clé VITE présente
    if (!data || response.status === 404 || response.status === 501) {
      return callGroqDirect(body);
    }

    throw new Error(`Erreur assistant (${response.status}).`);
  } catch (error) {
    if (clientApiKey()) {
      try {
        return await callGroqDirect(body);
      } catch {
        /* keep original */
      }
    }
    throw error instanceof Error
      ? error
      : new Error("Impossible de contacter l’assistant pour le moment.");
  }
}

export function isAiConfigured(): boolean {
  return Boolean(clientApiKey() || import.meta.env.DEV);
}
