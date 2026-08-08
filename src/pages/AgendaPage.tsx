import { Link } from "react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicLayout } from "../components/landing/PublicLayout";
import { AgendaCalendar } from "../components/landing/AgendaCalendar";
import contentService, { AgendaItem, getLatestAgendaItems } from "../services/contentService";

const PAGE_SIZE = 5;

export function AgendaPage() {
  const [items, setItems] = useState<AgendaItem[]>(contentService.getContent().agendaItems);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handler = () => {
      setItems(contentService.getContent().agendaItems);
      setPage(1);
    };
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  const sorted = useMemo(() => getLatestAgendaItems(items, items.length), [items]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="dash-eyebrow">Agenda</p>
        <div className="sgi-tricolor-soft mt-2 h-1 w-20 rounded-full" aria-hidden />
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--sgi-ink)] sm:text-4xl">
          Tous les rendez-vous
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Consultez l’ensemble des événements du Centre Miroir Parfait et ouvrez chaque fiche pour voir les détails.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="grid gap-3">
              {pageItems.map((item, index) => {
                const globalIndex = (page - 1) * PAGE_SIZE + index;
                return (
                  <Link
                    key={item.id}
                    to={`/agenda/${item.id}`}
                    className={`dash-panel flex flex-col gap-4 border-l-4 p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:flex-row sm:items-center sm:p-5 ${
                      globalIndex % 3 === 0
                        ? "border-l-[var(--sgi-blue)]"
                        : globalIndex % 3 === 1
                          ? "border-l-[var(--sgi-gold)]"
                          : "border-l-[var(--sgi-red)]"
                    }`}
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${
                        globalIndex % 3 === 2 ? "bg-[var(--sgi-red)]" : "bg-[var(--sgi-blue)]"
                      }`}
                    >
                      <CalendarDays size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-bold uppercase tracking-[0.16em] ${
                          globalIndex % 3 === 2 ? "text-[var(--sgi-red)]" : "text-[var(--sgi-gold)]"
                        }`}
                      >
                        {item.date}
                      </p>
                      <h2 className="mt-1 font-display text-lg font-semibold text-[var(--sgi-ink)] sm:text-xl">
                        {item.title}
                      </h2>
                      {item.description && (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      )}
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
                );
              })}
            </div>

            {sorted.length > PAGE_SIZE && (
              <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-sm text-muted-foreground">
                  Page {page} sur {totalPages} · {sorted.length} rendez-vous
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex h-10 items-center gap-1 rounded-full border border-border bg-white px-3 text-sm font-semibold text-[var(--sgi-ink)] transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Page précédente"
                  >
                    <ArrowLeft size={16} /> Préc.
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => goToPage(pageNumber)}
                      aria-current={pageNumber === page ? "page" : undefined}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition ${
                        pageNumber === page
                          ? "bg-[var(--sgi-blue)] text-white"
                          : "border border-border bg-white text-[var(--sgi-ink)] hover:bg-secondary"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex h-10 items-center gap-1 rounded-full border border-border bg-white px-3 text-sm font-semibold text-[var(--sgi-ink)] transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Page suivante"
                  >
                    Suiv. <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <AgendaCalendar items={items} />
        </div>
      </section>
    </PublicLayout>
  );
}
