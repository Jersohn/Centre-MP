import { motion } from "motion/react";
import { ArrowRight, CalendarDays, Clock, MapPin, UserRound } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import contentService, { getLatestAgendaItems } from "../../services/contentService";
import { Reveal, SectionIntro, Stagger, staggerItem, useMotionSafe } from "./motion";

const PREVIEW_LIMIT = 3;

export function AgendaSection() {
  const [agendaItems, setAgendaItems] = useState(contentService.getContent().agendaItems);
  const animate = useMotionSafe();

  useEffect(() => {
    const handler = () => setAgendaItems(contentService.getContent().agendaItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  const latestItems = useMemo(
    () => getLatestAgendaItems(agendaItems, PREVIEW_LIMIT),
    [agendaItems],
  );
  const hasMore = agendaItems.length > PREVIEW_LIMIT;

  return (
    <section id="agenda" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SectionIntro
        eyebrow="Agenda"
        title="Rendez-vous à ne pas manquer"
        action={
          hasMore ? (
            <Link
              to="/agenda"
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--sgi-blue)] hover:underline"
            >
              Voir plus <ArrowRight size={16} />
            </Link>
          ) : undefined
        }
      />

      <Stagger className="mt-6 grid gap-3" delay={0.06} stagger={0.07}>
        {latestItems.map((item, index) => (
          <motion.div key={item.id} variants={animate ? staggerItem : undefined}>
            <motion.div whileHover={animate ? { x: 4 } : undefined} transition={{ duration: 0.22 }}>
              <Link
                to={`/agenda/${item.id}`}
                className={`dash-panel flex flex-col gap-4 border-l-4 p-4 hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:p-5 ${
                  index % 3 === 0
                    ? "border-l-[var(--sgi-blue)]"
                    : index % 3 === 1
                      ? "border-l-[var(--sgi-gold)]"
                      : "border-l-[var(--sgi-red)]"
                }`}
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${
                    index % 3 === 2 ? "bg-[var(--sgi-red)]" : "bg-[var(--sgi-blue)]"
                  }`}
                >
                  <CalendarDays size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-bold uppercase tracking-[0.16em] ${
                      index % 3 === 2 ? "text-[var(--sgi-red)]" : "text-[var(--sgi-gold)]"
                    }`}
                  >
                    {item.date}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold text-[var(--sgi-ink)] sm:text-xl">
                    {item.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} /> {item.time}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} /> {item.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <UserRound size={14} /> {item.responsible}
                    </span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-blue)]">
                    Voir le détail <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        ))}
      </Stagger>

      {hasMore && (
        <Reveal className="mt-6 flex justify-center" delay={0.15}>
          <Link
            to="/agenda"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--sgi-blue)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--sgi-blue-deep)]"
          >
            Voir plus d’événements <ArrowRight size={16} />
          </Link>
        </Reveal>
      )}
    </section>
  );
}
