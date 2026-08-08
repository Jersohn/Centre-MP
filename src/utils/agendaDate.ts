const MONTHS_FR: Record<string, number> = {
  janvier: 0,
  fevrier: 1,
  février: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  aout: 7,
  août: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  decembre: 11,
  décembre: 11,
};

/** Clé locale YYYY-MM-DD (évite les décalages UTC). */
export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse les dates agenda admin : « 14 août 2026 », « 14/08/2026 », « 2026-08-14 ». */
export function parseAgendaDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const raw = value.trim();

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const slash = raw.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (slash) {
    const date = new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fr = raw
    .toLowerCase()
    .normalize("NFC")
    .match(/^(\d{1,2})\s+([a-zàâäéèêëïîôùûüç]+)\s+(\d{4})$/i);
  if (fr) {
    const month = MONTHS_FR[fr[2]];
    if (month === undefined) return null;
    const date = new Date(Number(fr[3]), month, Number(fr[1]), 12);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(raw);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 12);
}
