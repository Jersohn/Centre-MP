type Size = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
  xl: "h-16 w-16 text-xl",
};

type Props = {
  photo?: string | null;
  prenom?: string;
  nom?: string;
  name?: string;
  size?: Size;
  className?: string;
};

function getInitials(prenom?: string, nom?: string, name?: string) {
  if (prenom || nom) {
    return `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?";
  }
  if (name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }
  return "?";
}

export function MemberAvatar({ photo, prenom, nom, name, size = "md", className = "" }: Props) {
  const initials = getInitials(prenom, nom, name);

  if (photo) {
    return (
      <img
        src={photo}
        alt={name || `${prenom ?? ""} ${nom ?? ""}`.trim() || "Photo membre"}
        className={`${SIZE_CLASS[size]} shrink-0 rounded-full object-cover ring-2 ring-[var(--sgi-gold)]/30 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${SIZE_CLASS[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--sgi-blue)] font-display font-bold text-white ring-2 ring-[var(--sgi-gold)]/25 ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}
