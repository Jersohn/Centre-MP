/**
 * GET /api/encouragement-du-jour
 * Daily Encouragement officiel (directive / encouragement du jour) en français.
 */

export const config = {
  runtime: "edge",
};

const MONTH_SLUGS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

function buildDailyEncouragementUrl(date = new Date()) {
  const month = MONTH_SLUGS[date.getMonth()];
  const day = date.getDate();
  return `https://www.sokaglobal.org/resources/daily-encouragement/${month}-${day}.html`;
}

function splitText(text, maxLen = 900) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
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

function decodeTranslated(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\u00a0/g, " ")
    .trim();
}

async function translateWithGoogle(text) {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=` +
    encodeURIComponent(text);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Translate (${response.status})`);
  const data = await response.json();
  const parts = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
  const translated = parts
    .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
    .join("")
    .trim();
  if (!translated) throw new Error("Google Translate: réponse vide");
  return decodeTranslated(translated);
}

async function translateWithMyMemory(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`MyMemory (${response.status})`);
  const data = await response.json();
  const translated = data.responseData?.translatedText?.trim();
  if (!translated || data.responseStatus !== 200) throw new Error("MyMemory indisponible");
  return decodeTranslated(translated);
}

async function translateChunk(text) {
  try {
    return await translateWithGoogle(text);
  } catch {
    return translateWithMyMemory(text);
  }
}

async function translateToFrench(text) {
  const source = String(text || "").trim();
  if (!source) return source;
  try {
    const chunks = splitText(source);
    const translatedChunks = [];
    for (const chunk of chunks) {
      try {
        translatedChunks.push(await translateChunk(chunk));
      } catch {
        translatedChunks.push(chunk);
      }
    }
    return translatedChunks.join(" ").trim();
  } catch {
    return source;
  }
}

async function fetchOfficialDailyEncouragement(date = new Date()) {
  const sourceUrl = buildDailyEncouragementUrl(date);
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Centre-Miroir-Parfait/1.0 (SGI Cote d'Ivoire study app)",
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur source officielle sokaglobal.org (${response.status})`);
  }

  const html = await response.text();
  const text = firstMatch(html, /<div class="text">([\s\S]*?)<\/div>/i);
  const referenceRaw = firstMatch(html, /<div class="name">([\s\S]*?)<\/div>/i);
  const reference = referenceRaw.replace(/^From\s+/i, "").trim();

  if (!text) {
    throw new Error("Encouragement officiel introuvable sur sokaglobal.org");
  }

  const frenchText = await translateToFrench(text);
  const frenchReference = reference
    ? await translateToFrench(reference).catch(() => reference)
    : "Daisaku Ikeda";

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return {
    title: "Encouragement du jour",
    text: frenchText,
    fullText: frenchText,
    author: "Daisaku Ikeda",
    reference: frenchReference,
    date: dateLabel,
    source: "Source officielle : Soka Gakkai Global — Daily Encouragement (traduction française)",
    sourceUrl,
    reflection:
      "Comment puis-je appliquer cet encouragement officiel dans ma vie et mon groupe aujourd’hui ?",
    language: "fr",
    originalLanguage: "en",
  };
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const payload = await fetchOfficialDailyEncouragement(new Date());
    return json(200, payload);
  } catch (error) {
    return json(502, {
      error: "Impossible de récupérer l’encouragement officiel",
      details: String(error),
      sourceUrl: "https://www.sokaglobal.org/resources/daily-encouragement/",
    });
  }
}
