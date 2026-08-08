import {
  fetchOfficialDailyEncouragement,
  type OfficialEncouragementItem,
} from "./officialEncouragement";
import type { DirectiveItem } from "./contentService";
import { DAILY_CACHE_KEYS, readDailyCache, writeDailyCache } from "./dailyCache";

export type EncouragementApiItem = OfficialEncouragementItem;

export function mapEncouragementToDirective(item: EncouragementApiItem): DirectiveItem {
  return {
    title: item.title,
    date: item.date,
    text: item.text,
    author: item.author,
    fullText: `${item.fullText}\n\n— ${item.author}\n${item.reference}`,
    reflection: item.reflection,
    source: item.source,
  };
}

export function getCachedEncouragementDuJour(): EncouragementApiItem | null {
  return readDailyCache<EncouragementApiItem>(DAILY_CACHE_KEYS.encouragement);
}

/**
 * Récupère l’encouragement du jour.
 * Utilise le cache du jour si disponible, sinon appelle l’API puis met en cache.
 */
export async function fetchEncouragementDuJour(): Promise<EncouragementApiItem | null> {
  const cached = getCachedEncouragementDuJour();
  if (cached?.text || cached?.fullText) {
    return cached;
  }

  const endpoints = ["/api/encouragement-du-jour"];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;
      const data = (await response.json()) as Partial<EncouragementApiItem>;
      if (!data.text && !data.fullText) continue;
      const text = data.fullText || data.text || "";
      const item: EncouragementApiItem = {
        title: data.title || "Encouragement du jour",
        text,
        fullText: text,
        author: data.author || "Daisaku Ikeda",
        reference: data.reference || "Daily Encouragement — Soka Gakkai Global",
        date: data.date || "",
        source:
          data.source ||
          "Source officielle : Soka Gakkai Global — Daily Encouragement (traduction française)",
        sourceUrl: data.sourceUrl || "https://www.sokaglobal.org/",
        reflection:
          data.reflection ||
          "Comment puis-je appliquer cet encouragement officiel dans ma vie et mon groupe aujourd’hui ?",
        language: "fr",
        originalLanguage: "en",
      };
      writeDailyCache(DAILY_CACHE_KEYS.encouragement, item);
      return item;
    } catch {
      // essaie le fallback
    }
  }

  try {
    const item = await fetchOfficialDailyEncouragement();
    writeDailyCache(DAILY_CACHE_KEYS.encouragement, item);
    return item;
  } catch {
    return null;
  }
}
