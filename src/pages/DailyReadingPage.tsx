import { Link, useSearchParams } from "react-router";
import { ArrowLeft, BookOpen, Lightbulb, LoaderCircle, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { PublicLayout } from "../components/landing/PublicLayout";
import contentService, { LandingContent } from "../services/contentService";
import { useGoshoDuJour } from "../hooks/useGoshoDuJour";
import { useEncouragementDuJour } from "../hooks/useEncouragementDuJour";

type Tab = "encouragement" | "gosho";

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {text.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={index} className="text-base leading-8 text-[var(--sgi-ink)]/90 sm:text-lg sm:leading-9">
          {paragraph.trim()}
        </p>
      ))}
    </div>
  );
}

export function DailyReadingPage() {
  const [params, setParams] = useSearchParams();
  const initialTab = params.get("onglet") === "gosho" ? "gosho" : "encouragement";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [content, setContent] = useState<LandingContent>(contentService.getContent());
  const {
    gosho: apiGosho,
    dateLabel,
    author,
    sourceUrl: goshoSourceUrl,
    loading: goshoLoading,
  } = useGoshoDuJour({ enabled: !content.useManualGosho });
  const {
    directive: apiEncouragement,
    reference: encouragementReference,
    sourceUrl: encouragementSourceUrl,
    loading: encouragementLoading,
  } = useEncouragementDuJour({ enabled: !content.useManualEncouragement });

  useEffect(() => {
    const handler = () => setContent(contentService.getContent());
    window.addEventListener("landing-content-updated", handler);
    return () => window.removeEventListener("landing-content-updated", handler);
  }, []);

  useEffect(() => {
    const next = params.get("onglet") === "gosho" ? "gosho" : "encouragement";
    setTab(next);
  }, [params]);

  const selectTab = (next: Tab) => {
    setTab(next);
    setParams(next === "gosho" ? { onglet: "gosho" } : {});
  };

  const encouragement = content.useManualEncouragement
    ? content.dailyDirective
    : apiEncouragement || content.dailyDirective;
  const gosho = content.useManualGosho ? content.goshoPassage : apiGosho || content.goshoPassage;
  const encouragementBody = encouragement.fullText || encouragement.text;
  const goshoBody = gosho.fullText || gosho.excerpt;

  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          to="/#aujourdhui"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sgi-blue)] hover:underline"
        >
          <ArrowLeft size={16} /> Retour à aujourd’hui
        </Link>

        <div className="mt-5">
          <p className="dash-eyebrow">Lecture du jour</p>
          <div className="sgi-tricolor-soft mt-2 h-1 w-20 rounded-full" aria-hidden />
          <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--sgi-ink)] sm:text-4xl">
            Étude quotidienne
          </h1>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-secondary/80 p-1">
          <button
            type="button"
            onClick={() => selectTab("encouragement")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
              tab === "encouragement"
                ? "bg-[var(--sgi-red)] text-white shadow-sm"
                : "text-[var(--sgi-ink)] hover:bg-white/70"
            }`}
          >
            <SunMedium size={16} /> Encouragement
          </button>
          <button
            type="button"
            onClick={() => selectTab("gosho")}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
              tab === "gosho"
                ? "bg-[var(--sgi-blue)] text-white shadow-sm"
                : "text-[var(--sgi-ink)] hover:bg-white/70"
            }`}
          >
            <BookOpen size={16} /> Gosho
          </button>
        </div>

        {tab === "encouragement" ? (
          <article className="dash-panel mt-5 overflow-hidden">
            <div className="border-l-4 border-l-[var(--sgi-red)] bg-[var(--sgi-red)]/5 px-5 py-6 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sgi-red)]">
                {encouragement.title}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{encouragement.date}</p>

              {encouragementLoading ? (
                <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle size={16} className="animate-spin" /> Chargement…
                </div>
              ) : (
                <h2 className="mt-4 font-display text-2xl font-semibold leading-snug text-[var(--sgi-ink)] sm:text-3xl">
                  “{encouragement.text}”
                </h2>
              )}
              <p className="mt-4 text-sm font-semibold text-[var(--sgi-blue)]">— {encouragement.author}</p>
              {encouragementReference && (
                <p className="mt-2 text-xs text-muted-foreground">{encouragementReference}</p>
              )}
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <h3 className="font-display text-xl font-semibold text-[var(--sgi-ink)]">Texte complet</h3>
              <div className="mt-4">
                {encouragementLoading ? (
                  <p className="text-sm text-muted-foreground">Mise à jour automatique en cours…</p>
                ) : (
                  <Paragraphs text={encouragementBody} />
                )}
              </div>

              {encouragement.reflection && !encouragementLoading && (
                <div className="mt-8 rounded-2xl border border-[var(--sgi-gold)]/30 bg-[var(--sgi-gold)]/10 p-4 sm:p-5">
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--sgi-ink)]">
                    <Lightbulb size={16} className="text-[var(--sgi-gold)]" /> Point de réflexion
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">
                    {encouragement.reflection}
                  </p>
                </div>
              )}

              <p className="mt-6 text-xs text-muted-foreground">
                {encouragement.source || "Source officielle : Soka Gakkai Global — Daily Encouragement"}
                {" · "}
                <a
                  href={encouragementSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--sgi-blue)] underline"
                >
                  Voir sur sokaglobal.org
                </a>
              </p>
            </div>
          </article>
        ) : (
          <article className="dash-panel mt-5 overflow-hidden">
            <div className="bg-[var(--sgi-blue)] px-5 py-6 text-white sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--sgi-gold-soft)]">{gosho.title}</p>
              {gosho.goshoTitle && <p className="mt-2 text-sm text-white/75">{gosho.goshoTitle}</p>}
              <p className="mt-2 text-sm text-white/70">
                {author} · {dateLabel || content.dailyDirective.date}
              </p>

              {goshoLoading ? (
                <div className="mt-6 inline-flex items-center gap-2 text-sm text-white/80">
                  <LoaderCircle size={16} className="animate-spin" /> Chargement du Gosho du jour…
                </div>
              ) : (
                <h2 className="mt-4 font-display text-2xl font-semibold leading-snug sm:text-3xl">
                  “{gosho.excerpt}”
                </h2>
              )}
              <p className="mt-4 text-sm text-white/75">{gosho.reference}</p>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-8">
              {gosho.context && (
                <p className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm leading-7 text-muted-foreground">
                  {gosho.context}
                </p>
              )}

              <h3 className="mt-6 font-display text-xl font-semibold text-[var(--sgi-ink)]">Lecture complète</h3>
              <div className="mt-4">
                {goshoLoading ? (
                  <p className="text-sm text-muted-foreground">Mise à jour automatique en cours…</p>
                ) : (
                  <Paragraphs text={goshoBody} />
                )}
              </div>

              {gosho.reflection && !goshoLoading && (
                <div className="mt-8 rounded-2xl border border-[var(--sgi-red)]/20 bg-[var(--sgi-red)]/5 p-4 sm:p-5">
                  <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--sgi-ink)]">
                    <Lightbulb size={16} className="text-[var(--sgi-red)]" /> Point de réflexion
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">{gosho.reflection}</p>
                </div>
              )}

              <p className="mt-6 text-xs text-muted-foreground">
                {gosho.source || "Source officielle : SGI-USA — Daily Wisdom"}
                {" · "}
                <a
                  href={goshoSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--sgi-blue)] underline"
                >
                  Voir la source officielle
                </a>
              </p>
            </div>
          </article>
        )}
      </section>
    </PublicLayout>
  );
}
