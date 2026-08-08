import { Link } from "react-router";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicLayout } from "../components/landing/PublicLayout";
import contentService, { GalleryItem } from "../services/contentService";

export function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>(contentService.getContent().galleryItems);

  useEffect(() => {
    const handler = () => setItems(contentService.getContent().galleryItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="dash-eyebrow">Galerie</p>
        <div className="sgi-tricolor-soft mt-2 h-1 w-20 rounded-full" aria-hidden />
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--sgi-ink)] sm:text-4xl">
          Tous les moments du centre
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Explorez les activités, cérémonies et rencontres du Centre Miroir Parfait. Ouvrez une fiche pour voir tous
          les détails.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/galerie/${item.id}`}
              className="dash-panel group overflow-hidden transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                {item.category && (
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sgi-red)]">{item.category}</p>
                )}
                <h2 className="mt-2 font-display text-xl font-semibold text-[var(--sgi-ink)]">{item.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {item.date && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={13} /> {item.date}
                    </span>
                  )}
                  {item.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} /> {item.location}
                    </span>
                  )}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-blue)]">
                  Voir le détail <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
