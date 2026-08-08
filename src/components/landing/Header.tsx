import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Download, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import sgiLogo from "../../../image/logo-sgi.jpg";
import { landingHashPath, scrollToLandingHash } from "../../utils/landingNav";

const links = [
  { label: "Accueil", href: "#hero", type: "hash" as const },
  { label: "Lecture du jour", href: "/lecture-du-jour", type: "route" as const },
  { label: "Actualités", href: "/actualites", type: "route" as const },
  { label: "Galerie", href: "/galerie", type: "route" as const },
  { label: "Témoignages", href: "/temoignages", type: "route" as const },
  { label: "Agenda", href: "/agenda", type: "route" as const },
  { label: "Contact", href: "#contact", type: "hash" as const },
];

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const onLanding = location.pathname === "/";
  const [scrolled, setScrolled] = useState(!onLanding);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const solid = !onLanding || scrolled || mobileOpen;

  useEffect(() => {
    if (!onLanding) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [onLanding]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const goToHash = (href: string) => {
    if (location.pathname === "/") {
      scrollToLandingHash(href);
      return;
    }
    navigate(landingHashPath(href));
  };

  const handleHashNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    setMobileOpen(false);
    // Attendre la fermeture du menu pour que le clic ne soit pas annulé sur mobile
    window.setTimeout(() => goToHash(href), 180);
  };

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        solid
          ? "border-b border-border bg-white/95 shadow-[var(--shadow-soft)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src={sgiLogo}
            alt="Logo SGI"
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-[var(--sgi-red)]/35 shadow-sm sm:h-12 sm:w-12"
          />
          <div className="min-w-0">
            <p
              className={`truncate font-display text-base font-semibold leading-tight sm:text-lg ${
                solid ? "text-[var(--sgi-blue)]" : "text-white"
              }`}
            >
              Centre Miroir Parfait
            </p>
            <p
              className={`truncate text-[0.7rem] font-medium sm:text-xs ${
                solid ? "text-muted-foreground" : "text-white/80"
              }`}
            >
              SGI • Côte d’Ivoire
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-6 xl:flex">
          <nav
            className={`flex items-center gap-5 text-sm font-semibold ${
              solid ? "text-slate-700" : "text-white/90"
            }`}
          >
            {links.map((link) =>
              link.type === "route" ? (
                <Link
                  key={link.href}
                  to={link.href}
                  className="transition hover:text-[var(--sgi-blue)]"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={landingHashPath(link.href)}
                  onClick={(event) => {
                    event.preventDefault();
                    goToHash(link.href);
                  }}
                  className="transition hover:text-[var(--sgi-blue)]"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
          {installPrompt && (
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              style={
                solid
                  ? { borderColor: "var(--border)", background: "var(--secondary)", color: "var(--sgi-blue)" }
                  : undefined
              }
            >
              <Download size={16} /> Installer
            </button>
          )}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sgi-gold)] px-3.5 py-1.5 text-xs font-bold text-[var(--sgi-ink)] shadow-md shadow-[var(--sgi-gold)]/20 transition hover:-translate-y-0.5"
          >
            <UserRound size={14} />
            Espace responsables
          </Link>
        </div>

        <div className="flex items-center gap-2 xl:hidden">
          {installPrompt && (
            <button
              onClick={handleInstall}
              aria-label="Installer l’application"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                solid ? "bg-secondary text-[var(--sgi-blue)]" : "bg-white/15 text-white"
              }`}
            >
              <Download size={18} />
            </button>
          )}
          <Link
            to="/login"
            className="inline-flex items-center gap-1 rounded-full bg-[var(--sgi-gold)] px-2.5 py-1.5 text-[0.7rem] font-bold text-[var(--sgi-ink)] sm:px-3"
          >
            <UserRound size={13} />
            Espace responsables
          </Link>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
              solid
                ? "border border-border bg-white text-[var(--sgi-blue)]"
                : "bg-white/15 text-white backdrop-blur"
            }`}
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border bg-white xl:hidden"
          >
            <nav className="grid max-h-[70vh] gap-1 overflow-y-auto px-4 py-3" aria-label="Menu mobile">
              {links.map((link) =>
                link.type === "route" ? (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-700 transition active:bg-secondary hover:bg-secondary hover:text-[var(--sgi-blue)]"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={landingHashPath(link.href)}
                    onClick={(event) => handleHashNavClick(event, link.href)}
                    className="rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-700 transition active:bg-secondary hover:bg-secondary hover:text-[var(--sgi-blue)]"
                  >
                    {link.label}
                  </a>
                ),
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
