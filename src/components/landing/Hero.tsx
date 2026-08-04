import { motion } from "motion/react";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router";
import contentService from "../../services/contentService";
import { useEffect, useState } from "react";

export function Hero() {
  const [content, setContent] = useState(contentService.getContent());

  useEffect(() => {
    const handler = () => setContent(contentService.getContent());
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="hero" className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        <img src={content.heroImage} alt="Activité du centre SGI" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[#0f3d6e]/80" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-3xl text-center sm:text-left">
          <div className="mb-6 inline-flex flex-wrap items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur sm:justify-start">
            <span className="mr-2 h-2.5 w-2.5 rounded-full bg-[#d9a11a]" />
            <span className="inline-flex items-center gap-1">Soka Gakkai International <svg role="img" aria-label="Drapeau de la Côte d'Ivoire" className="mx-1 inline-block w-4 h-3 rounded-sm overflow-hidden" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" focusable="false">
                <rect width="1" height="2" x="0" y="0" fill="#F77F00" />
                <rect width="1" height="2" x="1" y="0" fill="#FFFFFF" />
                <rect width="1" height="2" x="2" y="0" fill="#138808" />
              </svg> Côte d’Ivoire • Centre Miroir Parfait</span>
          </div>
          <h1 className="break-words text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">{content.heroTitle}</h1>
          <p className="mt-6 max-w-full text-lg leading-8 text-slate-100/90 sm:text-xl break-words">{content.heroParagraph}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
            <a href="#centre" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d9a11a] px-6 py-3.5 font-semibold text-slate-900 transition hover:-translate-y-0.5 sm:w-auto">Découvrir le Centre <ArrowRight size={18} /></a>
            <a href="#actualites" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto">Voir les actualités <Play size={18} /></a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
