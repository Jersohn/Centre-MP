import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkles, SunMedium } from "lucide-react";
import contentService from "../../services/contentService";
import { useEffect, useState } from "react";
import { scrollToLandingHash } from "../../utils/landingNav";
import { easeOutSoft } from "./motion";

const SLIDE_MS = 6500;

export function Hero() {
  const [content, setContent] = useState(contentService.getContent());
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);
  const reduceMotion = useReducedMotion();
  const slides = content.heroImages?.length
    ? content.heroImages
    : [{ src: content.heroImage, alt: "Centre Miroir Parfait" }];
  const slideCount = slides.length;

  useEffect(() => {
    const handler = () => setContent(contentService.getContent());
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  useEffect(() => {
    if (reduceMotion || slideCount < 2) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % slideCount);
    }, SLIDE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, slideCount, tick]);

  // Précharge les images pour des transitions fluides.
  useEffect(() => {
    slides.forEach((slide) => {
      const img = new Image();
      img.src = slide.src;
    });
  }, [slideCount, content.heroImages]);

  return (
    <section id="hero" className="relative min-h-[100svh] overflow-hidden bg-[var(--sgi-blue-deep)]">
      <div className="absolute inset-0">
        <AnimatePresence mode="sync" initial={false}>
          <motion.img
            key={slides[active]?.src ?? active}
            src={slides[active]?.src}
            alt={slides[active]?.alt ?? ""}
            className="absolute inset-0 h-full w-full object-cover object-center"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.06 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { opacity: { duration: 1.1, ease: easeOutSoft }, scale: { duration: SLIDE_MS / 1000, ease: "linear" } }
            }
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--sgi-blue-deep)]/75 via-[var(--sgi-blue)]/70 to-[var(--sgi-blue-deep)]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,151,26,0.22),transparent_45%)]" />
      </div>

      <div className="sgi-tricolor absolute bottom-0 left-0 right-0 h-1.5" aria-hidden />

      {slides.length > 1 ? (
        <div
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 sm:bottom-10"
          role="tablist"
          aria-label="Images de la bannière"
        >
          {slides.map((slide, index) => {
            const isActive = index === active;
            return (
              <button
                key={slide.src}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Afficher l’image ${index + 1}`}
                onClick={() => {
                  setActive(index);
                  setTick((value) => value + 1);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive ? "w-7 bg-[var(--sgi-gold-soft)]" : "w-2 bg-white/45 hover:bg-white/70"
                }`}
              />
            );
          })}
        </div>
      ) : null}

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-4 pb-28 pt-28 sm:justify-center sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
        <motion.div
          className="max-w-3xl"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: reduceMotion ? 0 : 0.12, delayChildren: 0.1 },
            },
          }}
        >
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOutSoft } },
            }}
            className="mb-4 inline-flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--sgi-gold-soft)]"
          >
            <Sparkles size={14} className="text-[var(--sgi-red-soft)]" />
            Soka Gakkai International
            <span className="inline-flex overflow-hidden rounded-sm" aria-hidden>
              <span className="h-3 w-1 bg-[#F77F00]" />
              <span className="h-3 w-1 bg-white" />
              <span className="h-3 w-1 bg-[#138808]" />
            </span>
            Côte d’Ivoire
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, scaleX: 0 },
              show: { opacity: 1, scaleX: 1, transition: { duration: 0.55, ease: easeOutSoft } },
            }}
            className="sgi-tricolor-soft mb-4 h-1 w-24 origin-left rounded-full"
            aria-hidden
          />

          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 28 },
              show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: easeOutSoft } },
            }}
            className="font-display text-[2.15rem] font-semibold leading-[1.12] text-white sm:text-5xl lg:text-6xl"
          >
            Centre Miroir Parfait
          </motion.h1>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOutSoft } },
            }}
            className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/90 sm:text-lg sm:leading-8"
          >
            {content.heroParagraph}
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 18 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOutSoft } },
            }}
            className="mt-8"
          >
            <motion.a
              href="/#aujourdhui"
              onClick={(event) => {
                event.preventDefault();
                scrollToLandingHash("#aujourdhui");
              }}
              whileHover={reduceMotion ? undefined : { y: -3, scale: 1.02 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--sgi-red)] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[var(--sgi-red)]/30 transition hover:bg-[var(--sgi-red-deep)] sm:w-auto"
            >
              Découvrir aujourd’hui <SunMedium size={18} />
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
