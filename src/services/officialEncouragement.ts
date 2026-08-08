import { translateToFrench } from "./translateToFrench";

export type OfficialEncouragementItem = {
  title: string;
  text: string;
  fullText: string;
  author: string;
  reference: string;
  date: string;
  source: string;
  sourceUrl: string;
  reflection: string;
  language: "fr";
  originalLanguage: "en";
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
] as const;

function decodeHtml(value: string) {
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
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : "";
}

export function buildDailyEncouragementUrl(date = new Date()) {
  const month = MONTH_SLUGS[date.getMonth()];
  const day = date.getDate(); // august-8 (pas august-08)
  return `https://www.sokaglobal.org/resources/daily-encouragement/${month}-${day}.html`;
}

export function parseDailyEncouragementHtml(html: string) {
  const text = firstMatch(html, /<div class="text">([\s\S]*?)<\/div>/i);
  const referenceRaw = firstMatch(html, /<div class="name">([\s\S]*?)<\/div>/i);
  const reference = referenceRaw
    .replace(/^From\s+/i, "")
    .replace(/^De\s+/i, "")
    .replace(/<\/?i>/gi, "")
    .trim();

  if (!text) {
    throw new Error("Encouragement officiel introuvable sur sokaglobal.org");
  }

  return {
    text,
    reference: reference || "Daisaku Ikeda",
  };
}

/** Récupère le Daily Encouragement officiel Soka Gakkai Global, en français. */
export async function fetchOfficialDailyEncouragement(
  date = new Date(),
): Promise<OfficialEncouragementItem> {
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
  const { text, reference } = parseDailyEncouragementHtml(html);
  const frenchText = await translateToFrench(text);
  const frenchReference = /[A-Za-z]{3,}/.test(reference)
    ? await translateToFrench(reference).catch(() => reference)
    : reference;

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
