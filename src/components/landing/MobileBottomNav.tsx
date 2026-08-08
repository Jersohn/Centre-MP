import { BookOpen, Home, Images, Newspaper, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router";

const items = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Lecture", href: "/lecture-du-jour", icon: BookOpen },
  { label: "Galerie", href: "/galerie", icon: Images },
  { label: "Avis", href: "/temoignages", icon: Newspaper },
  { label: "Compte", href: "/login", icon: UserRound },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/95 px-2 pt-2 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Navigation mobile"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? location.pathname === "/"
              : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
          const className = `flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[0.65rem] font-semibold transition ${
            active
              ? "bg-[var(--sgi-red)]/10 text-[var(--sgi-red)]"
              : "text-muted-foreground hover:text-[var(--sgi-blue)]"
          }`;

          return (
            <li key={item.label}>
              <Link to={item.href} className={className}>
                <Icon size={20} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
