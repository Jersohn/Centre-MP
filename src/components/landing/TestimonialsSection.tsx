import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import contentService, { TestimonialItem } from "../../services/contentService";
import { HorizontalScroll } from "./HorizontalScroll";
import { Reveal, SectionIntro, useMotionSafe } from "./motion";

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(contentService.getContent().testimonials);
  const animate = useMotionSafe();

  useEffect(() => {
    const handler = () => setTestimonials(contentService.getContent().testimonials);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="temoignages" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionIntro
        eyebrow="Témoignages"
        title="La voix de nos membres"
        action={
          <Link
            to="/temoignages"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--sgi-red)] hover:underline"
          >
            Tous les témoignages <ArrowRight size={16} />
          </Link>
        }
      />

      <Reveal className="mt-6" delay={0.06}>
        <HorizontalScroll label="Témoignages">
          {testimonials.map((item) => (
            <motion.div
              key={item.id}
              whileHover={animate ? { y: -3 } : undefined}
              transition={{ duration: 0.25 }}
              className="w-[min(82vw,19rem)] shrink-0 snap-start sm:w-[21rem]"
            >
              <Link
                to={`/temoignages/${item.id}`}
                className="dash-panel flex h-full flex-col p-5 hover:shadow-[var(--shadow-lift)] sm:p-6"
              >
                <p className="line-clamp-4 font-display text-lg font-semibold leading-relaxed text-[var(--sgi-ink)]">
                  “{item.quote}”
                </p>
                <div className="mt-auto flex items-center gap-3 pt-5">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--sgi-red)]/35">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--sgi-ink)]">{item.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{item.role}</p>
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-blue)]">
                  Lire le détail <ArrowRight size={14} />
                </span>
              </Link>
            </motion.div>
          ))}
        </HorizontalScroll>
      </Reveal>
    </section>
  );
}
