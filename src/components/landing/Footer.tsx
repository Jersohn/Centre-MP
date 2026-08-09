import { Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import contentService from "../../services/contentService";
import { landingHashPath, scrollToLandingHash } from "../../utils/landingNav";
import { DeveloperCredit } from "../DeveloperCredit";
import { Reveal } from "./motion";

const footerLinks = [
  { label: "Présentation", href: "#centre", type: "hash" as const },
  { label: "Galerie", href: "/galerie", type: "route" as const },
  { label: "Agenda", href: "/agenda", type: "route" as const },
  { label: "Contact", href: "#contact", type: "hash" as const },
];

export function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [content, setContent] = useState(contentService.getContent());

  useEffect(() => {
    const handler = () => setContent(contentService.getContent());
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  const goToHash = (href: string) => {
    if (location.pathname === "/") {
      scrollToLandingHash(href);
      return;
    }
    navigate(landingHashPath(href));
  };

  return (
    <footer id="contact" className="border-t border-white/10 bg-[var(--sgi-blue-deep)] px-4 py-12 text-slate-200 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal className="space-y-4" y={16}>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.28em] text-[var(--sgi-gold-soft)]">
              Centre Miroir Parfait
            </p>
            <div className="sgi-tricolor-soft mt-3 h-1 w-24 rounded-full" aria-hidden />
            <h2 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">
              Un espace de transformation, d’échange et de paix.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
              Soka Gakkai International — Côte d’Ivoire. Accompagner les individus et les communautés vers la sagesse,
              la responsabilité et l’unité.
            </p>
          </Reveal>
          <div className="grid gap-8 sm:grid-cols-2">
            <Reveal delay={0.08} y={14}>
              <h3 className="font-display text-lg font-semibold text-white">Contact</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <Phone size={16} className="text-[var(--sgi-gold-soft)]" /> {content.contactPhone}
                </li>
                <li className="flex items-center gap-2">
                  <Mail size={16} className="text-[var(--sgi-red-soft)]" /> {content.contactEmail}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={16} className="text-[var(--sgi-gold-soft)]" /> {content.contactAddress}
                </li>
              </ul>
            </Reveal>
            <Reveal delay={0.14} y={14}>
              <h3 className="font-display text-lg font-semibold text-white">Navigation</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    {link.type === "route" ? (
                      <Link to={link.href} className="transition hover:text-white">
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={landingHashPath(link.href)}
                        onClick={(event) => {
                          event.preventDefault();
                          goToHash(link.href);
                        }}
                        className="transition hover:text-white"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
        <Reveal delay={0.1} y={10}>
          <div className="space-y-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:text-sm">
            <div className="sm:flex sm:items-center sm:justify-between">
              <p>© 2026 Soka Gakkai International — Centre Miroir Parfait, Côte d’Ivoire.</p>
              <p className="mt-3 sm:mt-0">Application installable sur votre appareil</p>
            </div>
            <DeveloperCredit variant="dark" />
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
