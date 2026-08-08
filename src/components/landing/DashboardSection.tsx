import { motion } from "motion/react";
import { ArrowRight, BookOpen, CalendarDays, LoaderCircle, Quote, SunMedium } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import contentService from "../../services/contentService";
import { useGoshoDuJour } from "../../hooks/useGoshoDuJour";
import { useEncouragementDuJour } from "../../hooks/useEncouragementDuJour";
import { Reveal, SectionIntro, easeOutSoft, useMotionSafe, viewportOnce } from "./motion";

export function DashboardSection() {
  const [content, setContent] = useState(contentService.getContent());
  const animate = useMotionSafe();
  const { gosho: apiGosho, loading: goshoLoading, author: goshoAuthor } = useGoshoDuJour({
    enabled: !content.useManualGosho,
  });
  const { directive: apiEncouragement, loading: encouragementLoading } = useEncouragementDuJour({
    enabled: !content.useManualEncouragement,
  });

  useEffect(() => {
    const handler = () => setContent(contentService.getContent());
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  const nextEvents = content.agendaItems.slice(-2).reverse();
  const gosho = content.useManualGosho ? content.goshoPassage : apiGosho || content.goshoPassage;
  const encouragement = content.useManualEncouragement
    ? content.dailyDirective
    : apiEncouragement || content.dailyDirective;

  return (
    <section id="aujourdhui" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionIntro
        eyebrow="Aujourd’hui"
        title="Votre journée au centre"
        className="mb-6 sm:mb-8"
        action={
          <Link
            to="/lecture-du-jour"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--sgi-blue)] hover:underline"
          >
            Ouvrir la lecture du jour <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-5" delay={0.05}>
          <motion.div whileHover={animate ? { y: -4 } : undefined} transition={{ duration: 0.25 }}>
            <Link
              to="/lecture-du-jour"
              className="relative block h-full overflow-hidden rounded-2xl border border-white/10 bg-[var(--sgi-blue)] p-5 text-white shadow-[var(--shadow-soft)] sm:p-6"
            >
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[var(--sgi-gold-soft)]">
                  <SunMedium size={18} />
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">{encouragement.title}</p>
                </div>
                <p className="mt-2 text-xs text-white/70">{encouragement.date}</p>
                <p className="mt-4 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
                  “{encouragement.text || encouragement.fullText}”
                </p>
                {encouragementLoading && (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs text-white/75">
                    <LoaderCircle size={14} className="animate-spin" /> Mise à jour…
                  </p>
                )}
                <p className="mt-4 text-sm font-semibold text-white/85">— {encouragement.author}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-gold-soft)]">
                  Lire l’encouragement complet <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </motion.div>
        </Reveal>

        <Reveal className="lg:col-span-4" delay={0.12}>
          <motion.div whileHover={animate ? { y: -4 } : undefined} transition={{ duration: 0.25 }}>
            <Link
              to="/lecture-du-jour?onglet=gosho"
              className="relative block h-full overflow-hidden rounded-2xl border border-white/10 bg-[var(--sgi-blue)] p-5 text-white shadow-[var(--shadow-soft)] sm:p-6"
            >
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
              <div className="relative">
                <div className="flex items-center gap-2 text-[var(--sgi-gold-soft)]">
                  <BookOpen size={18} />
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">{gosho.title}</p>
                </div>
                <p className="mt-2 text-xs text-white/70">{gosho.reference}</p>
                <p className="mt-4 font-display text-xl font-semibold leading-snug text-white sm:text-2xl">
                  “{gosho.excerpt || gosho.fullText}”
                </p>
                {goshoLoading && (
                  <p className="mt-2 inline-flex items-center gap-2 text-xs text-white/75">
                    <LoaderCircle size={14} className="animate-spin" /> Mise à jour…
                  </p>
                )}
                <p className="mt-4 text-sm font-semibold text-white/85">— {goshoAuthor}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-gold-soft)]">
                  Lire le Gosho du jour <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </motion.div>
        </Reveal>

        <Reveal className="lg:col-span-3" delay={0.18}>
          <article className="dash-panel h-full p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[var(--sgi-blue)]">
              <CalendarDays size={18} />
              <p className="text-xs font-bold uppercase tracking-[0.2em]">À venir</p>
            </div>
            <ul className="mt-4 space-y-3">
              {nextEvents.map((event) => (
                <li key={event.id || event.title} className="rounded-xl bg-secondary/70 px-3 py-3">
                  <p className="text-sm font-bold text-[var(--sgi-ink)]">{event.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.date} · {event.time}
                  </p>
                </li>
              ))}
            </ul>
            <Link to="/agenda" className="mt-4 inline-flex text-sm font-bold text-[var(--sgi-blue)] hover:underline">
              Voir l’agenda
            </Link>
          </article>
        </Reveal>

        <Reveal className="lg:col-span-12" delay={0.22} y={14}>
          <motion.blockquote
            className="dash-panel flex items-start gap-3 p-5 sm:p-6"
            initial={animate ? { opacity: 0.96 } : false}
            whileInView={
              animate
                ? {
                    boxShadow: [
                      "0 0 0 0 rgba(194,58,43,0)",
                      "0 0 0 6px rgba(194,58,43,0.08)",
                      "0 0 0 0 rgba(194,58,43,0)",
                    ],
                  }
                : undefined
            }
            viewport={viewportOnce}
            transition={{ duration: 1.4, ease: easeOutSoft }}
          >
            <Quote className="mt-0.5 shrink-0 text-[var(--sgi-red)]" size={22} />
            <div>
              <div className="sgi-tricolor-soft mb-3 h-1 w-16 rounded-full" aria-hidden />
              <p className="font-display text-lg font-semibold text-[var(--sgi-ink)] sm:text-xl">
                {content.thoughtOfDay}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Pensée du jour — Centre Miroir Parfait</p>
            </div>
          </motion.blockquote>
        </Reveal>
      </div>
    </section>
  );
}
