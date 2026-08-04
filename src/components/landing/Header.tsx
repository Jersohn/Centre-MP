import { motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import sgiLogo from "../../../image/logo-sgi.jpg";

const links = [
  { label: "Accueil", href: "/#hero" },
  { label: "Notre Centre", href: "/#centre" },
  { label: "Activités", href: "/#activites" },
  { label: "Galerie", href: "/#galerie" },
  { label: "Actualités", href: "/#actualites" },
  { label: "Agenda", href: "/#agenda" },
  { label: "Témoignages", href: "/#temoignages" },
  { label: "Contact", href: "/#contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 shadow-sm backdrop-blur-xl" : "bg-transparent"}`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3 text-slate-900">
          <img src={sgiLogo} alt="Logo officiel SGI" className="h-12 w-12 rounded-full object-cover ring-2 ring-[#F4C542]/20 shadow-sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f3d6e]">Centre Miroir Parfait</p>
            <p className="text-xs text-slate-500 sm:text-sm">Soka Gakkai International • Côte d’Ivoire</p>
          </div>
        </Link>

        <div className="hidden lg:flex lg:items-center lg:gap-8">
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-700">
            {links.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-[#0f3d6e]">{link.label}</a>
            ))}
          </nav>
          <Link to="/login" className="rounded-full bg-[#0f3d6e] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0f3d6e]/20 transition hover:-translate-y-0.5">Connexion</Link>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <Link to="/login" className="rounded-full bg-[#0f3d6e] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-[#0f3d6e]/20 transition hover:bg-[#0b2f5b]">Connexion</Link>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-300"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 px-4 py-4 shadow-xl">
          <div className="grid gap-3 text-sm font-medium text-slate-700">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-2xl px-4 py-3 transition hover:bg-slate-100 hover:text-[#0f3d6e]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.header>
  );
}
