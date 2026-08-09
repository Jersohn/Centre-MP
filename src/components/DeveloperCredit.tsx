const PORTFOLIO_URL = "https://jersohn.github.io/portfolio/";

type Props = {
  /** dark = pied de page site ; light = login / dashboard */
  variant?: "dark" | "light" | "muted";
  className?: string;
};

export function DeveloperCredit({ variant = "muted", className = "" }: Props) {
  const linkClass =
    variant === "dark"
      ? "font-semibold text-[var(--sgi-gold-soft)] underline-offset-2 transition hover:text-white hover:underline"
      : variant === "light"
        ? "font-semibold text-[var(--sgi-blue)] underline-offset-2 transition hover:underline"
        : "font-semibold text-foreground/80 underline-offset-2 transition hover:text-[var(--sgi-blue)] hover:underline";

  const textClass =
    variant === "dark"
      ? "text-slate-300"
      : variant === "light"
        ? "text-muted-foreground"
        : "text-muted-foreground";

  return (
    <p className={`text-xs leading-5 sm:text-sm ${textClass} ${className}`.trim()}>
      Développé par{" "}
      <a
        href={PORTFOLIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        AFJ-Tech
      </a>
    </p>
  );
}
