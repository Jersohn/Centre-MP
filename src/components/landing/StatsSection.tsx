import CountUp from "react-countup";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";
import { Reveal, SectionIntro, Stagger, staggerItem, useMotionSafe } from "./motion";

export function StatsSection() {
  const [stats, setStats] = useState(contentService.getContent().stats);
  const animate = useMotionSafe();

  useEffect(() => {
    const handler = () => setStats(contentService.getContent().stats);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <section id="activites" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <SectionIntro
        eyebrow="Indicateurs"
        title="La communauté en chiffres"
        action={
          <p className="max-w-sm text-sm leading-6 text-muted-foreground sm:text-right">
            Une lecture claire de la vitalité du Centre Miroir Parfait.
          </p>
        }
      />

      <Reveal className="mt-6 overflow-hidden rounded-[1.75rem] border border-border bg-[var(--sgi-blue-deep)] text-white">
        <div className="relative px-5 py-7 sm:px-8 sm:py-9">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,151,26,0.28),transparent_45%)]"
            aria-hidden
          />
          <div className="sgi-tricolor-soft relative mb-5 h-1 w-28 rounded-full" aria-hidden />
          <Stagger className="relative grid grid-cols-2 gap-3 sm:grid-cols-4" stagger={0.05}>
            {stats.map((stat, index) => {
              const accents = [
                "text-[var(--sgi-gold-soft)]",
                "text-white",
                "text-[var(--sgi-red-soft)]",
                "text-[var(--sgi-gold-soft)]",
                "text-white",
                "text-[var(--sgi-red-soft)]",
              ];
              return (
                <motion.div
                  key={stat.label}
                  variants={animate ? staggerItem : undefined}
                  whileHover={animate ? { y: -3 } : undefined}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center backdrop-blur-sm sm:px-4 sm:py-5"
                >
                  <p className={`font-display text-2xl font-semibold sm:text-3xl ${accents[index % accents.length]}`}>
                    <CountUp end={stat.value} duration={2} separator=" " enableScrollSpy scrollSpyOnce />
                    {stat.suffix}
                  </p>
                  <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/70 sm:text-xs">
                    {stat.label}
                  </p>
                </motion.div>
              );
            })}
          </Stagger>
        </div>
      </Reveal>
    </section>
  );
}
