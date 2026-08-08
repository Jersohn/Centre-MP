import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Tag, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicLayout } from "../components/landing/PublicLayout";
import contentService, { GalleryItem } from "../services/contentService";

export function GalleryDetailPage() {
  const { id } = useParams();
  const [items, setItems] = useState<GalleryItem[]>(contentService.getContent().galleryItems);

  useEffect(() => {
    const handler = () => setItems(contentService.getContent().galleryItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  const item = useMemo(() => items.find((entry) => entry.id === id), [items, id]);
  const currentIndex = item ? items.findIndex((entry) => entry.id === item.id) : -1;
  const previous = currentIndex > 0 ? items[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;

  if (!item) {
    return <Navigate to="/galerie" replace />;
  }

  return (
    <PublicLayout>
      <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          to="/galerie"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sgi-blue)] hover:underline"
        >
          <ArrowLeft size={16} /> Retour à la galerie
        </Link>

        <div className="dash-panel mt-5 overflow-hidden">
          <div className="aspect-[16/10] overflow-hidden sm:aspect-[21/9]">
            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
          </div>

          <div className="p-5 sm:p-8">
            <div className="sgi-tricolor-soft h-1 w-20 rounded-full" aria-hidden />
            {item.category && (
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[var(--sgi-red)]">{item.category}</p>
            )}
            <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--sgi-ink)] sm:text-4xl">{item.title}</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{item.description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {item.date && (
                <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                    <CalendarDays size={16} className="text-[var(--sgi-gold)]" /> Date
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.date}</p>
                </div>
              )}
              {item.location && (
                <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                    <MapPin size={16} className="text-[var(--sgi-red)]" /> Lieu
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.location}</p>
                </div>
              )}
              {item.chapter && (
                <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                    <Users size={16} className="text-[var(--sgi-blue)]" /> Chapitre
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.chapter}</p>
                </div>
              )}
              {item.category && (
                <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                    <Tag size={16} className="text-[var(--sgi-gold)]" /> Catégorie
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.category}</p>
                </div>
              )}
            </div>

            {item.content && (
              <div className="mt-8">
                <h2 className="font-display text-2xl font-semibold text-[var(--sgi-ink)]">À propos de ce moment</h2>
                <p className="mt-3 text-base leading-8 text-muted-foreground">{item.content}</p>
              </div>
            )}

            {item.highlights && item.highlights.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-2xl font-semibold text-[var(--sgi-ink)]">Points forts</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {item.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-[var(--sgi-blue)]"
                    >
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          {previous ? (
            <Link
              to={`/galerie/${previous.id}`}
              className="dash-panel inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--sgi-blue)]"
            >
              <ArrowLeft size={16} /> {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/galerie/${next.id}`}
              className="dash-panel inline-flex items-center justify-end gap-2 px-4 py-3 text-sm font-semibold text-[var(--sgi-blue)]"
            >
              {next.title} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </article>
    </PublicLayout>
  );
}
