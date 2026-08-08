import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicLayout } from "../components/landing/PublicLayout";
import contentService, { TestimonialItem } from "../services/contentService";

export function TestimonialsPage() {
  const [items, setItems] = useState<TestimonialItem[]>(contentService.getContent().testimonials);

  useEffect(() => {
    const handler = () => setItems(contentService.getContent().testimonials);
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="dash-eyebrow">Témoignages</p>
        <div className="sgi-tricolor-soft mt-2 h-1 w-20 rounded-full" aria-hidden />
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--sgi-ink)] sm:text-4xl">
          Paroles de membres
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          Découvrez les expériences complètes des responsables et membres du Centre Miroir Parfait.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/temoignages/${item.id}`}
              className="dash-panel group p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:p-6"
            >
              <p className="font-display text-lg font-semibold leading-relaxed text-[var(--sgi-ink)] sm:text-xl">
                “{item.quote}”
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full ring-2 ring-[var(--sgi-red)]/35">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--sgi-ink)]">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                  {item.chapter && <p className="text-xs font-semibold text-[var(--sgi-blue)]">{item.chapter}</p>}
                </div>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[var(--sgi-red)]">
                Lire le témoignage complet <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
