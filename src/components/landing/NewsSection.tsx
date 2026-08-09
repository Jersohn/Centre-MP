import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";
import { HorizontalScroll } from "./HorizontalScroll";
import { Reveal, SectionIntro, useMotionSafe } from "./motion";

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

      <Reveal className="mt-6" delay={0.06}>
        <HorizontalScroll label="Actualités">
          {newsItems.map((item, index) => (
            <motion.div
              key={item.id}
              whileHover={animate ? { y: -4 } : undefined}
              transition={{ duration: 0.25 }}
              className="w-[min(82vw,20rem)] shrink-0 snap-start sm:w-[22rem]"
            >
              <Link
                to={`/actualites/${item.id}`}
                className="dash-panel group flex h-full flex-col overflow-hidden hover:shadow-[var(--shadow-lift)]"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.16em] ${
                        index % 2 === 0 ? "text-[var(--sgi-gold)]" : "text-[var(--sgi-red)]"
                      }`}
                    >
                      {item.date}
                    </p>
                    <ArrowUpRight
                      size={16}
                      className="text-muted-foreground transition group-hover:text-[var(--sgi-red)]"
                    />
                  </div>
                  <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold text-[var(--sgi-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-bold text-[var(--sgi-red)]">
                    Lire en détail <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </HorizontalScroll>
      </Reveal>
    </section>
  );
}
