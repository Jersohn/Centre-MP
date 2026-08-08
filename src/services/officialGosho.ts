import { formatEnglishDateToFrench, translateToFrench } from "./translateToFrench";

export type OfficialGoshoItem = {
  title: string;
  goshoTitle: string;
  excerpt: string;
  context: string;
  reference: string;
  fullText: string;
  reflection: string;
  source: string;
  sourceUrl: string;
  date: string;
  author: string;
  language: "fr";
  originalLanguage: "en";
};

const OFFICIAL_DAILY_WISDOM_URL = "https://cms.sgi-usa.org/dw/";

function decodeHtml(value: string) {
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

function firstMatch(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

function allMatches(html: string, pattern: RegExp) {
  return [...html.matchAll(pattern)].map((match) => decodeHtml(match[1] || "")).filter(Boolean);
}

function makeExcerpt(text: string) {
  return text.length > 220 ? `${text.slice(0, 217).trim()}…` : text;
}

/** Parse le HTML officiel SGI-USA Daily Wisdom (anglais). */
export function parseOfficialDailyWisdomHtml(html: string) {
  const content = firstMatch(html, /<div class="post-content2">([\s\S]*?)<\/div>/i);
  const dates = allMatches(html, /<div class="post-date">([\s\S]*?)<\/div>/gi);
  const author = dates[0] || "Nichiren Daishonin";
  const date = dates[1] || new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  if (!content) {
    throw new Error("Contenu officiel introuvable sur la page Daily Wisdom.");
  }

  return { content, author, date };
}

/** Récupère le Gosho officiel du jour et le renvoie en français. */
export async function fetchOfficialDailyWisdom(): Promise<OfficialGoshoItem> {
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
  const { content, author, date } = parseOfficialDailyWisdomHtml(html);
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

export { OFFICIAL_DAILY_WISDOM_URL };
