/** Cache localStorage journalier pour Encouragement / Gosho. */

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type CacheEnvelope<T> = {
  day: string;
  savedAt: string;
  data: T;
};

export function readDailyCache<T>(storageKey: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.day || parsed.day !== todayKey() || !parsed.data) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeDailyCache<T>(storageKey: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    const payload: CacheEnvelope<T> = {
      day: todayKey(),
      savedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // quota / mode privé : ignorer
  }
}

export const DAILY_CACHE_KEYS = {
  encouragement: "cmf_encouragement_du_jour_v1",
  gosho: "cmf_gosho_du_jour_v1",
} as const;
