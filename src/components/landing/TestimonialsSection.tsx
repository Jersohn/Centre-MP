import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import contentService, { TestimonialItem } from "../../services/contentService";
import { SectionIntro, Stagger, staggerItem, useMotionSafe } from "./motion";

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

      <Stagger className="mt-6 grid gap-4 md:grid-cols-2" delay={0.08}>
        {testimonials.map((item) => (
          <motion.div key={item.id} variants={animate ? staggerItem : undefined}>
            <motion.div whileHover={animate ? { y: -4 } : undefined} transition={{ duration: 0.25 }}>
              <Link
                to={`/temoignages/${item.id}`}
                className="dash-panel block h-full p-5 hover:shadow-[var(--shadow-lift)] sm:p-6"
              >
                <p className="font-display text-lg font-semibold leading-relaxed text-[var(--sgi-ink)] sm:text-xl">
                  “{item.quote}”
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-[var(--sgi-red)]/35">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--sgi-ink)]">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.role}</p>
                  </div>
                </div>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-blue)]">
                  Lire le détail <ArrowRight size={14} />
                </span>
              </Link>
            </motion.div>
          </motion.div>
        ))}
      </Stagger>
    </section>
  );
}
