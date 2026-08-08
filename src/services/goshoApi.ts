import type { GoshoPassage } from "./contentService";
import {
  fetchOfficialDailyWisdom,
  type OfficialGoshoItem,
  OFFICIAL_DAILY_WISDOM_URL,
} from "./officialGosho";
import { DAILY_CACHE_KEYS, readDailyCache, writeDailyCache } from "./dailyCache";

export type GoshoApiItem = OfficialGoshoItem;

/** Convertit la réponse API vers le format utilisé par l’UI. */
export function mapGoshoApiToPassage(item: GoshoApiItem): GoshoPassage {
  const context = item.context || "";
  const hideContext =
    /SGI-USA Daily Wisdom|traduit automatiquement|Passage officiel du jour/i.test(context);

  return {
    title: item.title,
    goshoTitle: item.goshoTitle,
    excerpt: item.excerpt,
    context: hideContext ? "" : context,
    reference: item.reference,
    fullText: item.fullText,
    reflection: item.reflection,
    source: item.source,
  };
}

export function getCachedGoshoDuJour(): GoshoApiItem | null {
  return readDailyCache<GoshoApiItem>(DAILY_CACHE_KEYS.gosho);
}

/**
 * Récupère le Gosho / Daily Wisdom officiel du jour.
 * Utilise le cache du jour si disponible, sinon appelle l’API puis met en cache.
 */
export async function fetchGoshoDuJour(): Promise<GoshoApiItem | null> {
  const cached = getCachedGoshoDuJour();
  if (cached?.fullText || cached?.excerpt) {
    return cached;
  }

  const externalBase = import.meta.env.VITE_GOSHO_API_URL as string | undefined;

  const endpoints = [
    "/api/gosho-du-jour",
    externalBase ? externalBase.replace(/\/$/, "") : null,
  ].filter(Boolean) as string[];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;
      const data = (await response.json()) as Partial<GoshoApiItem>;
      if (!data.fullText && !data.excerpt) continue;
      const text = data.fullText || data.excerpt || "";
      const item: GoshoApiItem = {
        title: data.title || "Passage du Gosho",
        goshoTitle: data.goshoTitle || "Daily Wisdom — Writings of Nichiren Daishonin",
        excerpt: data.excerpt || (text.length > 220 ? `${text.slice(0, 217).trim()}…` : text),
        context: data.context || "",
        reference: data.reference || "The Writings of Nichiren Daishonin — Source officielle SGI-USA",
        fullText: text,
        reflection:
          data.reflection ||
          "Comment ce passage officiel du Gosho m’éclaire-t-il dans ma pratique et ma vie aujourd’hui ?",
        source: data.source || "Source officielle : SGI-USA — Daily Wisdom",
        sourceUrl: data.sourceUrl || OFFICIAL_DAILY_WISDOM_URL,
        date: data.date || "",
        author: data.author || "Nichiren Daishonin",
        language: "fr",
        originalLanguage: "en",
      };
      writeDailyCache(DAILY_CACHE_KEYS.gosho, item);
      return item;
    } catch {
      // essaie l’endpoint suivant
    }
  }

  try {
    const item = await fetchOfficialDailyWisdom();
    writeDailyCache(DAILY_CACHE_KEYS.gosho, item);
    return item;
  } catch {
    return null;
  }
}
