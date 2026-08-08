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

async function callGroqDirect(payload: {
  model: string;
  messages: AiChatMessage[];
  temperature: number;
  max_tokens: number;
}): Promise<string> {
  const key = clientApiKey();
  if (!key) {
    throw new Error(
      "Clé Groq manquante. Ajoutez GROQ_API_KEY (dev) ou VITE_GROQ_API_KEY dans votre fichier .env."
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
    const detail = await response.text().catch(() => "");
    throw new Error(
      detail
        ? `Groq a renvoyé une erreur (${response.status}).`
        : `Impossible de joindre Groq (${response.status}).`
    );
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

/** Appelle le proxy Vite `/api/ai-chat`, avec repli direct Groq si besoin. */
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
    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = (await response.json()) as { content?: string; error?: string };
      if (data.content?.trim()) return data.content.trim();
      if (data.error) throw new Error(data.error);
    }

    // Proxy absent (hébergement statique) → appel client si clé VITE présente
    if (response.status === 404 || response.status === 501) {
      return callGroqDirect(body);
    }

    const err = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || `Erreur assistant (${response.status}).`);
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
