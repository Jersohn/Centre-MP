const MONTHS: Record<string, string> = {
  january: "janvier",
  february: "février",
  march: "mars",
  april: "avril",
  may: "mai",
  june: "juin",
  july: "juillet",
  august: "août",
  september: "septembre",
  october: "octobre",
  november: "novembre",
  december: "décembre",
};

/** Convertit une date anglaise type "August 8th 2026" en français. */
export function formatEnglishDateToFrench(dateLabel: string): string {
  const match = dateLabel.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})/i);
  if (!match) return dateLabel;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return dateLabel;
  return `${Number(match[2])} ${month} ${match[3]}`;
}

function splitText(text: string, maxLen = 900): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf(" ", maxLen);
    if (cut < Math.floor(maxLen * 0.6)) cut = maxLen;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function decodeTranslated(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ")
    .trim();
}

/** Google Translate (endpoint public gtx) — prioritaire. */
async function translateWithGoogle(text: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=` +
    encodeURIComponent(text);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Translate (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  const parts = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
  const translated = parts
    .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
    .join("")
    .trim();

  if (!translated) {
    throw new Error("Google Translate: réponse vide");
  }

  return decodeTranslated(translated);
}

/** MyMemory — secours si Google échoue. */
async function translateWithMyMemory(text: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MyMemory (${response.status})`);
  }

  const data = (await response.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };

  const translated = data.responseData?.translatedText?.trim();
  if (!translated || data.responseStatus !== 200) {
    throw new Error("MyMemory: traduction indisponible");
  }

  return decodeTranslated(translated);
}

async function translateChunk(text: string): Promise<string> {
  try {
    return await translateWithGoogle(text);
  } catch {
    return translateWithMyMemory(text);
  }
}

/**
 * Traduit un texte anglais vers le français.
 * En cas d’échec total, renvoie le texte d’origine.
 */
export async function translateToFrench(text: string): Promise<string> {
  const source = text.trim();
  if (!source) return source;

  try {
    const chunks = splitText(source);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      try {
        translatedChunks.push(await translateChunk(chunk));
      } catch {
        translatedChunks.push(chunk);
      }
    }

    return translatedChunks.join(" ").replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n").trim();
  } catch {
    return source;
  }
}
