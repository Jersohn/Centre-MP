/**
 * GET /api/gosho-du-jour
 * Source officielle SGI-USA Daily Wisdom, renvoyée en français.
 */

const OFFICIAL_DAILY_WISDOM_URL = "https://cms.sgi-usa.org/dw/";

const MONTHS = {
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

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "’")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstMatch(html, pattern) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

function allMatches(html, pattern) {
  return [...html.matchAll(pattern)].map((match) => decodeHtml(match[1] || "")).filter(Boolean);
}

function formatEnglishDateToFrench(dateLabel) {
  const match = dateLabel.match(/([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})/i);
  if (!match) return dateLabel;
  const month = MONTHS[match[1].toLowerCase()];
  if (!month) return dateLabel;
  return `${Number(match[2])} ${month} ${match[3]}`;
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

function makeExcerpt(text) {
  return text.length > 220 ? `${text.slice(0, 217).trim()}…` : text;
}

async function fetchOfficialDailyWisdomFrench() {
  const response = await fetch(OFFICIAL_DAILY_WISDOM_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Centre-Miroir-Parfait/1.0 (SGI Cote d'Ivoire study app)",
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur source officielle SGI-USA (${response.status})`);
  }

  const html = await response.text();
  const content = firstMatch(html, /<div class="post-content2">([\s\S]*?)<\/div>/i);
  const dates = allMatches(html, /<div class="post-date">([\s\S]*?)<\/div>/gi);
  const author = dates[0] || "Nichiren Daishonin";
  const date = dates[1] || "";

  if (!content) {
    throw new Error("Contenu officiel introuvable sur la page Daily Wisdom.");
  }

  const frenchText = await translateToFrench(content);

  return {
    title: "Passage du Gosho",
    goshoTitle: "Sagesse quotidienne — Écrits de Nichiren Daishonin",
    excerpt: makeExcerpt(frenchText),
    context: "",
    reference: "Écrits de Nichiren Daishonin — Source officielle SGI-USA",
    fullText: frenchText,
    reflection:
      "Comment ce passage officiel du Gosho m’éclaire-t-il dans ma pratique et ma vie aujourd’hui ?",
    source: "Source officielle : SGI-USA — Daily Wisdom (traduction française automatique)",
    sourceUrl: OFFICIAL_DAILY_WISDOM_URL,
    date: formatEnglishDateToFrench(date),
    author,
    language: "fr",
    originalLanguage: "en",
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const payload = await fetchOfficialDailyWisdomFrench();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(payload));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        error: "Impossible de récupérer/traduire le Gosho officiel",
        details: String(error),
        sourceUrl: OFFICIAL_DAILY_WISDOM_URL,
      }),
    );
  }
};
