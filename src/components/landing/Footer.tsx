import { Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";

export function Footer() {
  const [content, setContent] = useState(contentService.getContent());

  useEffect(() => {
    const handler = () => setContent(contentService.getContent());
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <footer id="contact" className="border-t border-slate-200 bg-slate-950 px-4 py-16 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#d9a11a]">Centre Miroir Parfait</p>
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Un espace de transformation, d’échange et de paix.</h2>
            <p className="max-w-2xl text-base leading-8 text-slate-300">Le centre accompagne les individus et les communautés dans leur cheminement vers la sagesse, la responsabilité et la construction d’un monde plus juste.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-white">Contact</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><Phone size={16} className="text-[#d9a11a]" /> {content.contactPhone}</li>
                <li className="flex items-center gap-2"><Mail size={16} className="text-[#d9a11a]" /> {content.contactEmail}</li>
                <li className="flex items-center gap-2"><MapPin size={16} className="text-[#d9a11a]" /> {content.contactAddress}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Navigation</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li><a href="#hero" className="transition hover:text-white">Accueil</a></li>
                <li><a href="#centre" className="transition hover:text-white">Présentation</a></li>
                <li><a href="#activites" className="transition hover:text-white">Activités</a></li>
                <li><a href="#galerie" className="transition hover:text-white">Galerie</a></li>
                <li><a href="#actualites" className="transition hover:text-white">Actualités</a></li>
                <li><a href="#agenda" className="transition hover:text-white">Agenda</a></li>
                <li><a href="#temoignages" className="transition hover:text-white">Témoignages</a></li>
                <li><a href="#contact" className="transition hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 text-sm text-slate-500 sm:flex sm:items-center sm:justify-between">
          <p>© 2026 Soka Gakkai International — Centre Miroir Parfait. Tous droits réservés.</p>
          <div className="mt-4 flex flex-wrap gap-4 sm:mt-0">
            <a href="#hero" className="transition hover:text-white">Accueil</a>
            <a href="#galerie" className="transition hover:text-white">Galerie</a>
            <a href="#actualites" className="transition hover:text-white">Actualités</a>
            <a href="#contact" className="transition hover:text-white">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
