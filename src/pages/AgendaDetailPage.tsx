import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicLayout } from "../components/landing/PublicLayout";
import { AgendaCalendar } from "../components/landing/AgendaCalendar";
import contentService, { AgendaItem, getLatestAgendaItems } from "../services/contentService";

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {text.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={index} className="text-base leading-8 text-muted-foreground sm:text-lg sm:leading-9">
          {paragraph.trim()}
        </p>
      ))}
    </div>
  );
}

export function AgendaDetailPage() {
  const { id } = useParams();
  const [items, setItems] = useState<AgendaItem[]>(contentService.getContent().agendaItems);

  useEffect(() => {
    const handler = () => setItems(contentService.getContent().agendaItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  const sorted = useMemo(() => getLatestAgendaItems(items, items.length), [items]);
  const item = useMemo(() => sorted.find((entry) => entry.id === id), [sorted, id]);
  const currentIndex = item ? sorted.findIndex((entry) => entry.id === item.id) : -1;
  const previous = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

  if (!item) {
    return <Navigate to="/agenda" replace />;
  }

  const fullContent = item.content || item.description || item.title;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          to="/agenda"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sgi-blue)] hover:underline"
        >
          <ArrowLeft size={16} /> Retour à l’agenda
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <article>
            <div className="dash-panel overflow-hidden">
              <div className="border-l-4 border-l-[var(--sgi-blue)] bg-[var(--sgi-blue)]/5 px-5 py-6 sm:px-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sgi-gold)]">{item.date}</p>
                <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--sgi-ink)] sm:text-4xl">
                  {item.title}
                </h1>
                {item.description && (
                  <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">{item.description}</p>
                )}
              </div>

              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                    <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                      <CalendarDays size={16} className="text-[var(--sgi-gold)]" /> Date
                    </p>
                    <p className="mt-1 text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                    <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                      <Clock size={16} className="text-[var(--sgi-blue)]" /> Heure
                    </p>
                    <p className="mt-1 text-muted-foreground">{item.time}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                    <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                      <MapPin size={16} className="text-[var(--sgi-red)]" /> Lieu
                    </p>
                    <p className="mt-1 text-muted-foreground">{item.location}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                    <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                      <UserRound size={16} className="text-[var(--sgi-blue)]" /> Responsable
                    </p>
                    <p className="mt-1 text-muted-foreground">{item.responsible}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <h2 className="font-display text-2xl font-semibold text-[var(--sgi-ink)]">Détails de l’événement</h2>
                  <div className="mt-4">
                    <Paragraphs text={fullContent} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              {previous ? (
                <Link
                  to={`/agenda/${previous.id}`}
                  className="dash-panel inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--sgi-blue)]"
                >
                  <ArrowLeft size={16} /> {previous.title}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  to={`/agenda/${next.id}`}
                  className="dash-panel inline-flex items-center justify-end gap-2 px-4 py-3 text-sm font-semibold text-[var(--sgi-blue)]"
                >
                  {next.title} <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </article>

          <AgendaCalendar items={items} activeId={item.id} />
        </div>
      </div>
    </PublicLayout>
  );
}
