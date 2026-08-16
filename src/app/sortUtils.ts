/** Tri alphabétique français pour toutes les listes UI. */

export function compareFr(a: string | null | undefined, b: string | null | undefined) {
  return String(a || "").localeCompare(String(b || ""), "fr", { sensitivity: "base" });
}

export function sortByLabel<T>(items: T[], getLabel: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => compareFr(getLabel(a), getLabel(b)));
}

export function sortNames(names: string[]): string[] {
  return [...names].sort(compareFr);
}

/** Options de filtre : « Tous » en tête, puis libellés A→Z. */
export function withTousSorted(names: Iterable<string>): string[] {
  return ["Tous", ...sortNames([...new Set([...names].filter(Boolean))])];
}

/** Tri A→Z selon le nom affiché (Prénom Nom), comme dans la liste. */
export function memberDisplayName(member: {
  prenom?: string | null;
  nom?: string | null;
}) {
  return `${member.prenom || ""} ${member.nom || ""}`.trim().replace(/\s+/g, " ");
}

export function sortMembersByName<T extends { nom?: string | null; prenom?: string | null }>(
  members: T[],
): T[] {
  return [...members].sort((a, b) => {
    const byDisplay = compareFr(memberDisplayName(a), memberDisplayName(b));
    if (byDisplay !== 0) return byDisplay;
    const byNom = compareFr(a.nom, b.nom);
    return byNom !== 0 ? byNom : compareFr(a.prenom, b.prenom);
  });
}
