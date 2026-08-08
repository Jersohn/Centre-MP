import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";
import { Reveal, SectionIntro, Stagger, staggerItem, useMotionSafe } from "./motion";

export function NewsSection() {
  const [newsItems, setNewsItems] = useState(contentService.getContent().newsItems);
  const animate = useMotionSafe();

  useEffect(() => {
    const handler = () => setNewsItems(contentService.getContent().newsItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="actualites" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionIntro
        eyebrow="Actualités"
        title="Initiatives au service du bien commun"
        action={
          <Link
            to="/actualites"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--sgi-blue)] hover:underline"
          >
            Voir toutes les actualités <ArrowRight size={16} />
          </Link>
        }
      />

      <Stagger className="mt-6 grid gap-4 md:grid-cols-2" delay={0.08}>
        {newsItems.map((item, index) => (
          <motion.div key={item.id} variants={animate ? staggerItem : undefined}>
            <motion.div whileHover={animate ? { y: -5 } : undefined} transition={{ duration: 0.25 }}>
              <Link
                to={`/actualites/${item.id}`}
                className="dash-panel group block h-full overflow-hidden hover:shadow-[var(--shadow-lift)]"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.16em] ${
                        index % 2 === 0 ? "text-[var(--sgi-gold)]" : "text-[var(--sgi-red)]"
                      }`}
                    >
                      {item.date}
                    </p>
                    <ArrowUpRight size={16} className="text-muted-foreground transition group-hover:text-[var(--sgi-red)]" />
                  </div>
                  <h3 className="mt-3 font-display text-xl font-semibold text-[var(--sgi-ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.summary}</p>
                  <p className="mt-4 text-xs font-semibold text-[var(--sgi-blue)]">{item.author}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-red)]">
                    Lire en détail <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        ))}
      </Stagger>
    </section>
  );
}
