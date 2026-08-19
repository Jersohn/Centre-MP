import type { ChangeEvent } from "react";
import type { PlatformRole } from "./roles";

export const DIVISION_ROLES = [
  { key: "responsable", label: "Responsable" },
  { key: "homme", label: "Responsable homme" },
  { key: "femme", label: "Responsable femme" },
  { key: "jeunesse", label: "Responsable jeunesse" },
  { key: "jeune_homme", label: "Responsable jeune homme" },
  { key: "jeune_fille", label: "Responsable jeune fille" },
] as const;

export const ORG_LEVELS = [
  { key: "centre", label: "Centre" },
  { key: "chapitre", label: "Chapitre" },
  { key: "district", label: "District" },
  { key: "groupe", label: "Groupe" },
] as const;

export const MEMBRE_SIMPLE = "Membre simple";

function titleFor(divisionLabel: string, levelLabel: string) {
  if (divisionLabel === "Responsable") return `Responsable ${levelLabel.toLowerCase()}`;
  return `${divisionLabel} ${levelLabel.toLowerCase()}`;
}

function slugFor(divisionKey: string, levelKey: string) {
  if (divisionKey === "responsable") return `responsable_${levelKey}`;
  return `responsable_${divisionKey}_${levelKey}`;
}

export type ResponsabiliteGroup = {
  label: string;
  options: string[];
};

export const RESPONSABILITE_GROUPS: ResponsabiliteGroup[] = [
  { label: "Membre", options: [MEMBRE_SIMPLE] },
  ...ORG_LEVELS.map((level) => ({
    label: level.label,
    options: DIVISION_ROLES.map((division) => titleFor(division.label, level.label)),
  })),
];

export const MEMBER_RESPONSABILITES: string[] = RESPONSABILITE_GROUPS.flatMap((group) => group.options);

export const RESPONSABILITE_FILTERS = ["Tous", ...MEMBER_RESPONSABILITES] as const;

export const RESPONSABILITE_TO_DB: Record<string, string> = {
  [MEMBRE_SIMPLE]: "membre_simple",
  Membre: "membre_simple",
};

export const RESPONSABILITE_FROM_DB: Record<string, string> = {
  membre_simple: MEMBRE_SIMPLE,
};

for (const level of ORG_LEVELS) {
  for (const division of DIVISION_ROLES) {
    const label = titleFor(division.label, level.label);
    const slug = slugFor(division.key, level.key);
    RESPONSABILITE_TO_DB[label] = slug;
    RESPONSABILITE_FROM_DB[slug] = label;
  }
}

const PLATFORM_ROLE_BY_LEVEL: Record<string, PlatformRole> = {
  centre: "centre",
  chapitre: "chapitre",
  district: "district",
  groupe: "groupe",
};

export function displayResponsabilite(value: string | null | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return MEMBRE_SIMPLE;
  if (raw === "Membre") return MEMBRE_SIMPLE;
  return RESPONSABILITE_FROM_DB[raw] || raw;
}

export function toDbResponsabilite(value: string | null | undefined): string {
  const label = displayResponsabilite(value);
  return RESPONSABILITE_TO_DB[label] || "membre_simple";
}

export function isMembreSimple(value: string | null | undefined): boolean {
  const label = displayResponsabilite(value);
  return label === MEMBRE_SIMPLE || label === "Membre";
}

export function platformRoleFromResponsabiliteLabel(value: string): PlatformRole | null {
  const normalized = displayResponsabilite(value);
  if (normalized === "Administrateur" || normalized.toLowerCase() === "admin") return "admin";
  const slug = RESPONSABILITE_TO_DB[normalized];
  if (slug) {
    for (const level of ORG_LEVELS) {
      if (slug === `responsable_${level.key}` || slug.endsWith(`_${level.key}`)) {
        return PLATFORM_ROLE_BY_LEVEL[level.key];
      }
    }
  }
  const lower = normalized.toLowerCase();
  if (lower.endsWith(" centre") || lower === "responsable centre") return "centre";
  if (lower.endsWith(" chapitre") || lower === "responsable chapitre") return "chapitre";
  if (lower.endsWith(" district") || lower === "responsable district") return "district";
  if (lower.endsWith(" groupe") || lower === "responsable groupe") return "groupe";
  return null;
}

export function mainResponsabiliteForRole(role: PlatformRole): string {
  if (role === "centre" || role === "admin") return "Responsable centre";
  if (role === "chapitre") return "Responsable chapitre";
  if (role === "district") return "Responsable district";
  if (role === "groupe") return "Responsable groupe";
  return MEMBRE_SIMPLE;
}

export function responsabilitesForAssignableRoles(roles: PlatformRole[]): string[] {
  const allowed = new Set(roles);
  return MEMBER_RESPONSABILITES.filter((label) => {
    if (label === MEMBRE_SIMPLE) return false;
    const mapped = platformRoleFromResponsabiliteLabel(label);
    return mapped !== null && allowed.has(mapped);
  });
}

export function suggestedResponsabiliteForPromotion(
  current: string | null | undefined,
  assignable: string[],
  fallbackRole: PlatformRole,
): string {
  const label = displayResponsabilite(current);
  if (assignable.includes(label)) return label;
  const main = mainResponsabiliteForRole(fallbackRole);
  if (assignable.includes(main)) return main;
  return assignable[0] || main;
}

export const NEW_RESPONSABILITE_DB_VALUES = Object.values(RESPONSABILITE_TO_DB).filter(
  (slug) =>
    slug !== "membre_simple" &&
    slug !== "responsable_groupe" &&
    slug !== "responsable_district" &&
    slug !== "responsable_chapitre" &&
    slug !== "responsable_centre",
);

export function ResponsabiliteSelect({
  value,
  onChange,
  disabled,
  includeTous,
  excludeMembreSimple,
  allowedOptions,
  className = "dash-field",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  includeTous?: boolean;
  excludeMembreSimple?: boolean;
  allowedOptions?: string[];
  className?: string;
}) {
  const selected = value === "Tous" ? "Tous" : displayResponsabilite(value);
  const groups = RESPONSABILITE_GROUPS.map((group) => ({
    ...group,
    options: group.options.filter((option) => {
      if (excludeMembreSimple && option === MEMBRE_SIMPLE) return false;
      if (allowedOptions && !allowedOptions.includes(option)) return false;
      return true;
    }),
  })).filter((group) => group.options.length > 0);
  const known = new Set<string>([
    ...(includeTous ? ["Tous"] : []),
    ...groups.flatMap((group) => group.options),
  ]);

  return (
    <select
      value={selected}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {includeTous ? <option value="Tous">Tous</option> : null}
      {!known.has(selected) && selected ? <option value={selected}>{selected}</option> : null}
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
