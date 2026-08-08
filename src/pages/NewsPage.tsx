import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicLayout } from "../components/landing/PublicLayout";
import contentService, { NewsItem } from "../services/contentService";

export function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>(contentService.getContent().newsItems);

  useEffect(() => {
    const handler = () => setItems(contentService.getContent().newsItems);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="dash-eyebrow">Actualités</p>
        <div className="sgi-tricolor-soft mt-2 h-1 w-20 rounded-full" aria-hidden />
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--sgi-ink)] sm:text-4xl">
          Initiatives au service du bien commun
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Retrouvez toutes les actualités du Centre Miroir Parfait et ouvrez chaque article pour lire le détail
          complet.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((item, index) => (
            <Link
              key={item.id}
              to={`/actualites/${item.id}`}
              className="dash-panel group overflow-hidden transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5 sm:p-6">
                <p
                  className={`text-xs font-bold uppercase tracking-[0.16em] ${
                    index % 2 === 0 ? "text-[var(--sgi-gold)]" : "text-[var(--sgi-red)]"
                  }`}
                >
                  {item.date}
                  {item.category ? ` · ${item.category}` : ""}
                </p>
                <h2 className="mt-3 font-display text-xl font-semibold text-[var(--sgi-ink)]">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.summary}</p>
                <p className="mt-4 text-xs font-semibold text-[var(--sgi-blue)]">{item.author}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-red)]">
                  Lire l’actualité complète <ArrowRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
