import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, ArrowRight, BookOpen, MapPin, Quote, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicLayout } from "../components/landing/PublicLayout";
import contentService, { TestimonialItem } from "../services/contentService";

export function TestimonialDetailPage() {
  const { id } = useParams();
  const [items, setItems] = useState<TestimonialItem[]>(contentService.getContent().testimonials);

  useEffect(() => {
    const handler = () => setItems(contentService.getContent().testimonials);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  const item = useMemo(() => items.find((entry) => entry.id === id), [items, id]);
  const currentIndex = item ? items.findIndex((entry) => entry.id === item.id) : -1;
  const previous = currentIndex > 0 ? items[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;

  if (!item) {
    return <Navigate to="/temoignages" replace />;
  }

  return (
    <PublicLayout>
      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          to="/temoignages"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sgi-blue)] hover:underline"
        >
          <ArrowLeft size={16} /> Retour aux témoignages
        </Link>

        <div className="dash-panel mt-5 overflow-hidden">
          <div className="bg-[var(--sgi-blue)] px-5 py-8 text-white sm:px-8">
            <div className="sgi-tricolor-soft h-1 w-20 rounded-full" aria-hidden />
            <Quote className="mt-5 text-[var(--sgi-gold-soft)]" size={28} />
            <h1 className="mt-4 font-display text-2xl font-semibold leading-snug sm:text-3xl">“{item.quote}”</h1>
          </div>

          <div className="p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-[var(--sgi-red)]/25">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-[var(--sgi-ink)]">{item.name}</p>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">{item.role}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {item.chapter && (
                <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                    <BookOpen size={15} className="text-[var(--sgi-blue)]" /> Chapitre
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.chapter}</p>
                </div>
              )}
              {item.location && (
                <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                    <MapPin size={15} className="text-[var(--sgi-red)]" /> Localité
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.location}</p>
                </div>
              )}
              {item.memberSince && (
                <div className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm">
                  <p className="inline-flex items-center gap-2 font-semibold text-[var(--sgi-ink)]">
                    <Sparkles size={15} className="text-[var(--sgi-gold)]" /> Membre depuis
                  </p>
                  <p className="mt-1 text-muted-foreground">{item.memberSince}</p>
                </div>
              )}
            </div>

            {item.fullStory && (
              <div className="mt-8">
                <h2 className="font-display text-2xl font-semibold text-[var(--sgi-ink)]">Témoignage complet</h2>
                <p className="mt-3 text-base leading-8 text-muted-foreground">{item.fullStory}</p>
              </div>
            )}

            {item.themes && item.themes.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-[var(--sgi-ink)]">Thèmes</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.themes.map((theme, index) => {
                    const tones = [
                      "bg-[var(--sgi-blue)] text-white",
                      "bg-[var(--sgi-gold)] text-[var(--sgi-ink)]",
                      "bg-[var(--sgi-red)] text-white",
                    ];
                    return (
                      <span
                        key={theme}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${tones[index % tones.length]}`}
                      >
                        {theme}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          {previous ? (
            <Link
              to={`/temoignages/${previous.id}`}
              className="dash-panel inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[var(--sgi-blue)]"
            >
              <ArrowLeft size={16} /> {previous.name}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/temoignages/${next.id}`}
              className="dash-panel inline-flex items-center justify-end gap-2 px-4 py-3 text-sm font-semibold text-[var(--sgi-blue)]"
            >
              {next.name} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </article>
    </PublicLayout>
  );
}
