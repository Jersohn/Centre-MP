import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";

export function NewsSection() {
  const [newsItems, setNewsItems] = useState(contentService.getContent().newsItems);

  useEffect(() => {
    const handler = () => setNewsItems(contentService.getContent().newsItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="actualites" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0f3d6e]">Actualités</p>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Des événements et des initiatives au service du bien commun.</h2>
        </div>
        <a href="#actualites" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f3d6e]">Voir toutes les nouveautés <ArrowRight size={16} /></a>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {newsItems.map((item, index) => (
          <motion.article key={`${item.title}-${index}`} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
            <img src={item.image} alt={item.title} className="h-48 w-full object-cover" />
            <div className="p-6">
              <p className="text-sm text-slate-500">{item.date}</p>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary}</p>
              <p className="mt-4 text-sm text-slate-500">{item.author}</p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
