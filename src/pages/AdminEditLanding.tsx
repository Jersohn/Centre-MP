import { ChangeEvent, useEffect, useState } from "react";
import { CheckCircle2, Info, LoaderCircle, X, XCircle } from "lucide-react";
import contentService, {
  ChapterLeaderItem,
  DirectiveItem,
  GalleryItem,
  GoshoPassage,
  HeroSlide,
  LandingContent,
  LeaderItem,
  buildCentreStatsFromChapters,
  loadContent,
  saveContent,
} from "../services/contentService";
import { isSupabaseEnabled } from "../services/supabaseClient";
import { fetchLandingContentFromSupabase } from "../services/supabaseService";
import { uploadLandingMedia } from "../services/mediaUpload";
import { landingImages } from "../assets/landing/images";

type NoticeTone = "success" | "error" | "info" | "loading";

type Notice = {
  tone: NoticeTone;
  message: string;
};

export default function AdminEditLanding() {
  const initial = contentService.getContent();
  const [heroTitle, setHeroTitle] = useState(initial.heroTitle);
  const [heroParagraph, setHeroParagraph] = useState(initial.heroParagraph);
  const [heroImages, setHeroImages] = useState<HeroSlide[]>(initial.heroImages);
  const [aboutText, setAboutText] = useState(initial.aboutText);
  const [aboutImage, setAboutImage] = useState(initial.aboutImage);
  const [centreCommittee, setCentreCommittee] = useState<LeaderItem[]>(initial.centreCommittee);
  const [chapterLeaders, setChapterLeaders] = useState<ChapterLeaderItem[]>(initial.chapterLeaders);
  const [dailyDirective, setDailyDirective] = useState<DirectiveItem>(initial.dailyDirective);
  const [goshoPassage, setGoshoPassage] = useState<GoshoPassage>(initial.goshoPassage);
  const [useManualEncouragement, setUseManualEncouragement] = useState(initial.useManualEncouragement);
  const [useManualGosho, setUseManualGosho] = useState(initial.useManualGosho);
  const [thoughtOfDay, setThoughtOfDay] = useState(initial.thoughtOfDay);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(initial.galleryItems);
  const [newsItems, setNewsItems] = useState(initial.newsItems);
  const [agendaItems, setAgendaItems] = useState(initial.agendaItems);
  const [testimonials, setTestimonials] = useState(initial.testimonials);
  const [contactPhone, setContactPhone] = useState(initial.contactPhone);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [contactAddress, setContactAddress] = useState(initial.contactAddress);
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function showNotice(tone: NoticeTone, message: string) {
    setNotice({ tone, message });
  }

  function applyContent(current: LandingContent) {
    setHeroTitle(current.heroTitle);
    setHeroParagraph(current.heroParagraph);
    setHeroImages(current.heroImages?.length ? current.heroImages : [{ src: current.heroImage, alt: "Bannière" }]);
    setAboutText(current.aboutText);
    setAboutImage(current.aboutImage);
    setCentreCommittee(current.centreCommittee);
    setChapterLeaders(current.chapterLeaders);
    setDailyDirective(current.dailyDirective);
    setGoshoPassage(current.goshoPassage);
    setUseManualEncouragement(current.useManualEncouragement);
    setUseManualGosho(current.useManualGosho);
    setThoughtOfDay(current.thoughtOfDay);
    setGalleryItems(current.galleryItems);
    setNewsItems(current.newsItems);
    setAgendaItems(current.agendaItems);
    setTestimonials(current.testimonials);
    setContactPhone(current.contactPhone);
    setContactEmail(current.contactEmail);
    setContactAddress(current.contactAddress);
  }

  useEffect(() => {
    setRemoteSyncEnabled(isSupabaseEnabled());
    let cancelled = false;
    (async () => {
      showNotice("loading", "Chargement du contenu…");
      try {
        const remote = await loadContent();
        if (!cancelled) {
          applyContent(remote);
          showNotice("success", "Contenu chargé.");
        }
      } catch {
        if (!cancelled) showNotice("error", "Impossible de charger le contenu.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice || notice.tone === "loading") return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function uploadImage(file: File, folder: string) {
    setUploading(true);
    try {
      return await uploadLandingMedia(file, folder);
    } finally {
      setUploading(false);
    }
  }

  async function handleAboutUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAboutImage(await uploadImage(file, "about"));
      showNotice("success", "Image À propos téléversée.");
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Échec upload.");
    }
  }

  async function handleHeroSlideUpload(index: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "hero");
      setHeroImages((current) =>
        current.map((slide, i) => (i === index ? { ...slide, src: url } : slide)),
      );
      showNotice("success", `Image slider ${index + 1} téléversée.`);
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Échec upload.");
    }
  }

  async function handleAddHeroSlides(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      setUploading(true);
      showNotice("loading", "Téléversement des images…");
      const uploaded: HeroSlide[] = [];
      for (const file of files) {
        const src = await uploadLandingMedia(file, "hero");
        uploaded.push({ src, alt: `Bannière ${heroImages.length + uploaded.length + 1}` });
      }
      setHeroImages((current) => [...current, ...uploaded]);
      showNotice("success", `${uploaded.length} image(s) ajoutée(s) au slider.`);
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Échec upload.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeHeroSlide(index: number) {
    setHeroImages((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  function moveHeroSlide(index: number, direction: -1 | 1) {
    setHeroImages((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleCommitteeImageUpload(index: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "committee");
      setCentreCommittee((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? { ...item, image: url } : item)),
      );
      showNotice("success", "Photo du comité mise à jour.");
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Échec upload.");
    }
  }

  async function handleChapterImageUpload(index: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "chapters");
      setChapterLeaders((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? { ...item, responsibleImage: url } : item)),
      );
      showNotice("success", "Photo du chapitre mise à jour.");
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Échec upload.");
    }
  }

  async function handleGalleryUpload(index: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "gallery");
      setGalleryItems((current) =>
        current.map((item, itemIndex) => (itemIndex === index ? { ...item, image: url } : item)),
      );
      showNotice("success", "Image de galerie téléversée.");
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Échec upload.");
    }
  }

  function updateGalleryField(index: number, field: keyof GalleryItem, value: string) {
    setGalleryItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function addGalleryItem() {
    setGalleryItems((current) => [
      ...current,
      {
        id: `galerie-${Date.now()}`,
        title: "Nouvel élément de galerie",
        description: "Description courte du moment.",
        image: landingImages.gallery.meeting,
        content: "Description détaillée du moment.",
        date: "",
        location: "",
        chapter: "",
        category: "Activité",
      },
    ]);
  }

  function removeGalleryItem(index: number) {
    setGalleryItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function save() {
    const slides = heroImages.filter((slide) => slide.src.trim());
    if (slides.length === 0) {
      showNotice("error", "Ajoutez au moins une image au slider.");
      return;
    }

    const payload = {
      heroTitle,
      heroParagraph,
      heroImages: slides,
      heroImage: slides[0].src,
      aboutText,
      aboutImage,
      centreCommittee,
      chapterLeaders,
      dailyDirective,
      goshoPassage,
      useManualEncouragement,
      useManualGosho,
      thoughtOfDay,
      galleryItems,
      newsItems,
      agendaItems,
      testimonials,
      contactPhone,
      contactEmail,
      contactAddress,
    };

    setSaving(true);
    try {
      if (remoteSyncEnabled) {
        showNotice("loading", "Enregistrement en cours…");
        await saveContent(payload);
        showNotice("success", "Contenu publié — visible sur le site.");
      } else {
        contentService.setContent(payload);
        showNotice("info", "Contenu enregistré.");
      }
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Échec de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  async function syncRemote() {
    if (!remoteSyncEnabled) return;
    showNotice("loading", "Synchronisation en cours…");
    const remoteContent = await fetchLandingContentFromSupabase();
    if (remoteContent) {
      const current = contentService.setContent(remoteContent);
      applyContent(current);
      showNotice("success", "Contenu synchronisé.");
    } else {
      showNotice("error", "Impossible de synchroniser le contenu. Réessayez.");
    }
  }

  function reset() {
    contentService.resetContent();
    applyContent(contentService.getContent());
    showNotice("info", "Contenu réinitialisé aux valeurs par défaut.");
  }

  const noticeStyles: Record<NoticeTone, string> = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-[var(--sgi-blue)]/20 bg-[var(--sgi-blue)]/8 text-[var(--sgi-blue-deep)]",
    loading: "border-border bg-card text-foreground",
  };

  return (
    <div className="relative min-w-0 max-w-full space-y-5 overflow-x-hidden p-3 pb-28 sm:space-y-6 sm:p-6 sm:pb-28">
      {notice && (
        <div
          role="status"
          className={`sticky top-2 z-40 flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${noticeStyles[notice.tone]}`}
        >
          <span className="mt-0.5 shrink-0">
            {notice.tone === "success" && <CheckCircle2 size={18} />}
            {notice.tone === "error" && <XCircle size={18} />}
            {notice.tone === "info" && <Info size={18} />}
            {notice.tone === "loading" && <LoaderCircle size={18} className="animate-spin" />}
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium leading-6">{notice.message}</p>
          {notice.tone !== "loading" && (
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
              aria-label="Fermer la notification"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Édition du contenu du site</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Bannière, sections, galerie, actualités, agenda, témoignages et contact — utilisable aussi sur mobile.
            </p>
          </div>
          <div className="hidden flex-wrap gap-2 sm:flex">
            <button type="button" onClick={reset} className="rounded-xl border border-border px-4 py-2 text-sm text-foreground/80 transition hover:bg-muted">
              Réinitialiser
            </button>
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void save()}
              className="rounded-xl bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--sgi-blue-mid)] disabled:opacity-60"
            >
              {saving ? "Publication…" : "Enregistrer"}
            </button>
            {remoteSyncEnabled && (
              <button type="button" onClick={() => void syncRemote()} className="rounded-xl border border-[var(--sgi-gold)] px-4 py-2 text-sm font-semibold text-[var(--sgi-gold)] transition hover:bg-[var(--sgi-gold)]/10">
                Synchroniser
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Bannière / slider d’accueil</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Texte d’accueil et plusieurs images en rotation sur le hero du site.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80">Titre principal</label>
            <input
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80">Paragraphe</label>
            <textarea
              value={heroParagraph}
              onChange={(e) => setHeroParagraph(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-3xl border border-border bg-muted/60 p-4 text-sm text-foreground outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Images du slider ({heroImages.length})</h4>
              <p className="text-xs text-muted-foreground">Ajoutez, réordonnez ou retirez les visuels plein écran.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[var(--sgi-blue)] px-3 py-2 text-xs font-semibold text-white">
              {uploading ? "Téléversement…" : "Ajouter des images"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => void handleAddHeroSlides(e)}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {heroImages.map((slide, index) => (
              <div key={`${slide.src}-${index}`} className="rounded-3xl border border-border bg-muted/60 p-3">
                <img
                  src={slide.src}
                  alt={slide.alt || `Slide ${index + 1}`}
                  className="h-36 w-full rounded-2xl object-cover"
                />
                <div className="mt-3 space-y-2">
                  <input
                    value={slide.alt}
                    onChange={(e) =>
                      setHeroImages((current) =>
                        current.map((item, i) => (i === index ? { ...item, alt: e.target.value } : item)),
                      )
                    }
                    placeholder="Texte alternatif"
                    className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => void handleHeroSlideUpload(index, e)}
                    className="w-full text-xs text-foreground/80"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveHeroSlide(index, -1)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] text-foreground"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => moveHeroSlide(index, 1)}
                      className="rounded-lg border border-border px-2 py-1 text-[11px] text-foreground"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHeroSlide(index)}
                      disabled={heroImages.length <= 1}
                      className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-600 disabled:opacity-40"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Lecture du jour — Encouragement, Gosho & Pensée</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Par défaut, l’encouragement et le Gosho viennent des API. Activez « Contenu manuel » uniquement les jours où
          vous voulez publier votre propre texte. La pensée du jour est toujours gérée ici.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-border bg-muted/60 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h4 className="font-semibold text-[var(--sgi-red)]">Encouragement du jour</h4>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground/80">
                <input
                  type="checkbox"
                  checked={useManualEncouragement}
                  onChange={(e) => setUseManualEncouragement(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-[var(--sgi-red)] focus:ring-[var(--sgi-red)]"
                />
                Contenu manuel
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {useManualEncouragement
                ? "Le texte ci-dessous s’affiche à la place de l’API."
                : "API active. Le formulaire sert de secours si l’API est indisponible."}
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Date</label>
              <input
                value={dailyDirective.date}
                onChange={(e) => setDailyDirective((current) => ({ ...current, date: e.target.value }))}
                className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Citation courte</label>
              <textarea
                value={dailyDirective.text}
                onChange={(e) => setDailyDirective((current) => ({ ...current, text: e.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Auteur</label>
              <input
                value={dailyDirective.author}
                onChange={(e) => setDailyDirective((current) => ({ ...current, author: e.target.value }))}
                className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Texte complet (lecture dans l’app)</label>
              <textarea
                value={dailyDirective.fullText || ""}
                onChange={(e) => setDailyDirective((current) => ({ ...current, fullText: e.target.value }))}
                rows={8}
                className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Point de réflexion</label>
              <textarea
                value={dailyDirective.reflection || ""}
                onChange={(e) => setDailyDirective((current) => ({ ...current, reflection: e.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-border bg-muted/60 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h4 className="font-semibold text-[var(--sgi-blue)]">Passage du Gosho</h4>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground/80">
                <input
                  type="checkbox"
                  checked={useManualGosho}
                  onChange={(e) => setUseManualGosho(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-[var(--sgi-blue)] focus:ring-[var(--sgi-blue)]"
                />
                Contenu manuel
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {useManualGosho
                ? "Le texte ci-dessous s’affiche à la place de l’API."
                : "API active. Le formulaire sert de secours si l’API est indisponible."}
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Titre du Gosho</label>
              <input
                value={goshoPassage.goshoTitle || ""}
                onChange={(e) => setGoshoPassage((current) => ({ ...current, goshoTitle: e.target.value }))}
                className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Extrait court</label>
              <textarea
                value={goshoPassage.excerpt}
                onChange={(e) => setGoshoPassage((current) => ({ ...current, excerpt: e.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Référence</label>
              <input
                value={goshoPassage.reference}
                onChange={(e) => setGoshoPassage((current) => ({ ...current, reference: e.target.value }))}
                className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Contexte</label>
              <textarea
                value={goshoPassage.context}
                onChange={(e) => setGoshoPassage((current) => ({ ...current, context: e.target.value }))}
                rows={2}
                className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Texte complet (lecture dans l’app)</label>
              <textarea
                value={goshoPassage.fullText || ""}
                onChange={(e) => setGoshoPassage((current) => ({ ...current, fullText: e.target.value }))}
                rows={8}
                className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Point de réflexion</label>
              <textarea
                value={goshoPassage.reflection || ""}
                onChange={(e) => setGoshoPassage((current) => ({ ...current, reflection: e.target.value }))}
                rows={3}
                className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm outline-none focus:border-[var(--sgi-blue)]"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-3xl border border-border bg-muted/60 p-5">
          <h4 className="font-semibold text-[var(--sgi-ink)]">Pensée du jour</h4>
          <p className="text-xs text-muted-foreground">Toujours publiée depuis l’admin (pas d’API). Affichée dans la section Aujourd’hui de la landing.</p>
          <textarea
            value={thoughtOfDay}
            onChange={(e) => setThoughtOfDay(e.target.value)}
            rows={3}
            className="w-full rounded-3xl border border-border bg-card p-4 text-sm outline-none focus:border-[var(--sgi-blue)]"
            placeholder="Votre pensée du jour…"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Section À propos</h3>
        <p className="mt-2 text-sm text-muted-foreground">Actualisez le texte de présentation du centre et l’illustration associée.</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/80">Texte de présentation</label>
              <textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={6}
                className="mt-2 w-full rounded-3xl border border-border bg-muted/60 p-4 text-sm text-foreground outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80">Image de la section</label>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => void handleAboutUpload(e)}
                className="mt-2 text-sm text-foreground/80"
              />
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-muted/60 p-4">
            <div className="text-sm font-semibold text-foreground">Aperçu À propos</div>
            <img src={aboutImage} alt="Aperçu image about" className="mt-4 h-40 w-full rounded-2xl object-cover sm:h-64 sm:rounded-3xl" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Indicateurs du centre</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Calculés automatiquement à partir des statistiques des chapitres (non modifiables ici).
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {buildCentreStatsFromChapters(chapterLeaders).map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-border bg-muted/60 px-4 py-4 text-center">
              <p className="font-display text-2xl font-semibold text-[var(--sgi-blue)]">
                {stat.value}
                {stat.suffix}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Comité du centre</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Photos et noms des responsables : centre, homme, femme, jeunesse, jeune homme, jeune fille.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {centreCommittee.map((leader, index) => (
            <div key={leader.id} className="rounded-3xl border border-border bg-muted/60 p-4">
              <div className="flex gap-4">
                <img src={leader.image} alt={leader.name} className="h-24 w-20 rounded-2xl object-cover object-top" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Rôle</label>
                    <input
                      value={leader.role}
                      onChange={(e) =>
                        setCentreCommittee((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, role: e.target.value } : item,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Nom</label>
                    <input
                      value={leader.name}
                      onChange={(e) =>
                        setCentreCommittee((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: e.target.value } : item,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCommitteeImageUpload(index, e)}
                      className="mt-1 text-sm text-foreground/80"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Responsables de chapitres</h3>
        <p className="mt-2 text-sm text-muted-foreground">Portrait du responsable et statistiques de chaque chapitre.</p>
        <div className="mt-6 space-y-4">
          {chapterLeaders.map((chapter, index) => (
            <div key={chapter.id} className="rounded-3xl border border-border bg-muted/60 p-4">
              <div className="grid gap-4 lg:grid-cols-[140px_1fr]">
                <div>
                  <img
                    src={chapter.responsibleImage}
                    alt={chapter.responsibleName}
                    className="h-36 w-full rounded-2xl object-cover object-top"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleChapterImageUpload(index, e)}
                    className="mt-2 w-full text-xs text-foreground/80"
                  />
                </div>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Nom du chapitre</label>
                      <input
                        value={chapter.name}
                        onChange={(e) =>
                          setChapterLeaders((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, name: e.target.value } : item,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Responsable</label>
                      <input
                        value={chapter.responsibleName}
                        onChange={(e) =>
                          setChapterLeaders((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, responsibleName: e.target.value } : item,
                            ),
                          )
                        }
                        className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Description</label>
                    <textarea
                      value={chapter.description}
                      onChange={(e) =>
                        setChapterLeaders((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, description: e.target.value } : item,
                          ),
                        )
                      }
                      rows={2}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {chapter.stats.map((stat, statIndex) => (
                      <div key={`${chapter.id}-stat-${statIndex}`} className="rounded-2xl border border-border bg-card p-3">
                        <input
                          value={stat.label}
                          onChange={(e) =>
                            setChapterLeaders((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      stats: item.stats.map((entry, entryIndex) =>
                                        entryIndex === statIndex ? { ...entry, label: e.target.value } : entry,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="w-full rounded-xl border border-border px-2 py-1.5 text-xs outline-none"
                          placeholder="Libellé"
                        />
                        <div className="mt-2 flex gap-1">
                          <input
                            type="number"
                            value={stat.value}
                            onChange={(e) =>
                              setChapterLeaders((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        stats: item.stats.map((entry, entryIndex) =>
                                          entryIndex === statIndex
                                            ? { ...entry, value: Number(e.target.value) || 0 }
                                            : entry,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="w-full rounded-xl border border-border px-2 py-1.5 text-xs outline-none"
                          />
                          <input
                            value={stat.suffix}
                            onChange={(e) =>
                              setChapterLeaders((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        stats: item.stats.map((entry, entryIndex) =>
                                          entryIndex === statIndex ? { ...entry, suffix: e.target.value } : entry,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="w-14 rounded-xl border border-border px-2 py-1.5 text-xs outline-none"
                            placeholder="+"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Galerie</h3>
            <p className="mt-2 text-sm text-muted-foreground">Gérez les éléments visibles dans la galerie de la page d’accueil.</p>
          </div>
          <button
            type="button"
            onClick={addGalleryItem}
            className="self-start rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]"
          >
            Ajouter un visuel
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {galleryItems.map((item, index) => (
            <div key={index} className="rounded-3xl border border-border bg-muted/60 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Titre</label>
                    <input
                      value={item.title}
                      onChange={(e) => updateGalleryField(index, "title", e.target.value)}
                      className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Description</label>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateGalleryField(index, "description", e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm text-foreground outline-none transition focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Texte détaillé (page galerie)</label>
                    <textarea
                      value={item.content || ""}
                      onChange={(e) => updateGalleryField(index, "content", e.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Date</label>
                      <input
                        value={item.date || ""}
                        onChange={(e) => updateGalleryField(index, "date", e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Lieu</label>
                      <input
                        value={item.location || ""}
                        onChange={(e) => updateGalleryField(index, "location", e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Chapitre</label>
                      <input
                        value={item.chapter || ""}
                        onChange={(e) => updateGalleryField(index, "chapter", e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => void handleGalleryUpload(index, e)}
                      className="mt-2 text-sm text-foreground/80"
                    />
                  </div>
                </div>

                <div className="w-full max-w-full rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">Preview</span>
                    <button
                      type="button"
                      onClick={() => removeGalleryItem(index)}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
                    >Supprimer</button>
                  </div>
                  <img src={item.image} alt={`Aperçu galerie ${item.title}`} className="mt-4 h-48 w-full rounded-3xl object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Actualités</h3>
            <p className="mt-2 text-sm text-muted-foreground">Gérez les cartes d’actualités de la page d’accueil.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setNewsItems((current) => [
                ...current,
                {
                  id: `actualite-${Date.now()}`,
                  title: "Nouvelle actualité",
                  summary: "Résumé de la nouvelle.",
                  date: "Date",
                  author: "Auteur",
                  category: "Actualité",
                  location: "Abidjan, Côte d’Ivoire",
                  content: "Texte complet de l’actualité.",
                  image: landingImages.news.training,
                },
              ])
            }
            className="self-start rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]"
          >
            Ajouter une actualité
          </button>
        </div>
        <div className="mt-6 space-y-6">
          {newsItems.map((item, index) => (
            <div key={item.id || index} className="rounded-3xl border border-border bg-muted/60 p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Titre</label>
                    <input
                      value={item.title}
                      onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, title: e.target.value } : news))}
                      className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Résumé</label>
                    <textarea
                      value={item.summary}
                      onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, summary: e.target.value } : news))}
                      rows={3}
                      className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Texte complet (page détail)</label>
                    <textarea
                      value={item.content || ""}
                      onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, content: e.target.value } : news))}
                      rows={6}
                      className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Date</label>
                      <input
                        value={item.date}
                        onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, date: e.target.value } : news))}
                        className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Auteur</label>
                      <input
                        value={item.author}
                        onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, author: e.target.value } : news))}
                        className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Catégorie</label>
                      <input
                        value={item.category || ""}
                        onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, category: e.target.value } : news))}
                        className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Lieu</label>
                      <input
                        value={item.location || ""}
                        onChange={(e) => setNewsItems((current) => current.map((news, newsIndex) => newsIndex === index ? { ...news, location: e.target.value } : news))}
                        className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await uploadImage(file, "news");
                          setNewsItems((current) =>
                            current.map((news, newsIndex) => (newsIndex === index ? { ...news, image: url } : news)),
                          );
                        } catch (err) {
                          showNotice("error", err instanceof Error ? err.message : "Échec upload.");
                        }
                      }}
                      className="mt-2 text-sm text-foreground/80"
                    />
                  </div>
                </div>
                <div className="w-full max-w-full rounded-3xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-foreground">Preview</span>
                    <button
                      type="button"
                      onClick={() => setNewsItems((current) => current.filter((_, i) => i !== index))}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
                    >Supprimer</button>
                  </div>
                  <img src={item.image} alt={`Aperçu actualité ${item.title}`} className="mt-4 h-44 w-full rounded-3xl object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Agenda</h3>
            <p className="mt-2 text-sm text-muted-foreground">Organisez les événements et rendez-vous du centre.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setAgendaItems((current) => [
                ...current,
                {
                  id: `agenda-${Date.now()}`,
                  title: "Nouvel événement",
                  date: "Date",
                  time: "Heure",
                  location: "Lieu",
                  responsible: "Responsable",
                  description: "Courte description de l’événement.",
                  content: "Détails complets de l’événement.",
                },
              ])
            }
            className="self-start rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]"
          >
            Ajouter un événement
          </button>
        </div>
        <div className="mt-6 space-y-6">
          {agendaItems.map((item, index) => (
            <div key={item.id || index} className="rounded-3xl border border-border bg-muted/60 p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Titre</label>
                    <input
                      value={item.title}
                      onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, title: e.target.value } : agenda))}
                      className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Date</label>
                      <input
                        value={item.date}
                        onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, date: e.target.value } : agenda))}
                        className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Heure</label>
                      <input
                        value={item.time}
                        onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, time: e.target.value } : agenda))}
                        className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Description courte</label>
                    <textarea
                      value={item.description || ""}
                      onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, description: e.target.value } : agenda))}
                      rows={2}
                      className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Lieu</label>
                    <input
                      value={item.location}
                      onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, location: e.target.value } : agenda))}
                      className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Responsable</label>
                    <input
                      value={item.responsible}
                      onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, responsible: e.target.value } : agenda))}
                      className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Détails complets</label>
                    <textarea
                      value={item.content || ""}
                      onChange={(e) => setAgendaItems((current) => current.map((agenda, agendaIndex) => agendaIndex === index ? { ...agenda, content: e.target.value } : agenda))}
                      rows={5}
                      className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm text-foreground outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAgendaItems((current) => current.filter((_, i) => i !== index))}
                  className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
                >Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Témoignages</h3>
            <p className="mt-2 text-sm text-muted-foreground">Mettez à jour les avis présentés sur la page d’accueil.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setTestimonials((current) => [
                ...current,
                {
                  id: `temoignage-${Date.now()}`,
                  name: "Nouveau témoignage",
                  role: "Rôle",
                  quote: "Citation inspirante.",
                  image: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=400&q=80",
                  fullStory: "Récit complet du témoignage.",
                },
              ])
            }
            className="self-start rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]"
          >
            Ajouter un témoignage
          </button>
        </div>
        <div className="mt-6 space-y-6">
          {testimonials.map((item, index) => (
            <div key={item.id || index} className="rounded-3xl border border-border bg-muted/60 p-4 shadow-sm sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_12.5rem]">
                <div className="min-w-0 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Nom</label>
                      <input
                        value={item.name}
                        onChange={(e) => setTestimonials((current) => current.map((testimonial, testimonialIndex) => testimonialIndex === index ? { ...testimonial, name: e.target.value } : testimonial))}
                        className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/80">Rôle</label>
                      <input
                        value={item.role}
                        onChange={(e) => setTestimonials((current) => current.map((testimonial, testimonialIndex) => testimonialIndex === index ? { ...testimonial, role: e.target.value } : testimonial))}
                        className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Citation</label>
                    <textarea
                      value={item.quote}
                      onChange={(e) => setTestimonials((current) => current.map((testimonial, testimonialIndex) => testimonialIndex === index ? { ...testimonial, quote: e.target.value } : testimonial))}
                      rows={3}
                      className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Récit complet (page détail)</label>
                    <textarea
                      value={item.fullStory || ""}
                      onChange={(e) =>
                        setTestimonials((current) =>
                          current.map((testimonial, testimonialIndex) =>
                            testimonialIndex === index ? { ...testimonial, fullStory: e.target.value } : testimonial,
                          ),
                        )
                      }
                      rows={5}
                      className="mt-2 w-full rounded-3xl border border-border bg-card p-4 text-sm text-foreground outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80">Chapitre</label>
                    <input
                      value={item.chapter || ""}
                      onChange={(e) =>
                        setTestimonials((current) =>
                          current.map((testimonial, testimonialIndex) =>
                            testimonialIndex === index ? { ...testimonial, chapter: e.target.value } : testimonial,
                          ),
                        )
                      }
                      className="mt-2 w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <aside className="flex w-full flex-col gap-3 rounded-3xl border border-border bg-card p-4 lg:w-[12.5rem]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">Photo</span>
                    <button
                      type="button"
                      onClick={() => setTestimonials((current) => current.filter((_, i) => i !== index))}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="mx-auto aspect-square w-28 overflow-hidden rounded-full border border-border bg-muted sm:w-32 lg:w-full">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={`Aperçu témoignage ${item.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        Aucune photo
                      </div>
                    )}
                  </div>
                  <label className="block text-xs font-medium text-foreground/80">
                    Changer la photo
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await uploadImage(file, "testimonials");
                          setTestimonials((current) =>
                            current.map((testimonial, testimonialIndex) =>
                              testimonialIndex === index ? { ...testimonial, image: url } : testimonial,
                            ),
                          );
                        } catch (err) {
                          showNotice("error", err instanceof Error ? err.message : "Échec upload.");
                        }
                      }}
                      className="mt-2 block w-full text-xs text-foreground/80 file:mr-2 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                    />
                  </label>
                </aside>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Coordonnées</h3>
        <p className="mt-2 text-sm text-muted-foreground">Mettez à jour les informations de contact affichées dans le pied de page.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80">Téléphone</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80">Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80">Adresse</label>
            <input
              value={contactAddress}
              onChange={(e) => setContactAddress(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground outline-none sm:rounded-3xl"
            />
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-3 py-3 backdrop-blur-md sm:px-6">
        <div className="sgi-tricolor absolute inset-x-0 top-0 h-0.5" aria-hidden />
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Enregistrez vos modifications pour publier sur le site.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground/80 transition hover:bg-muted sm:py-2.5"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void save()}
              className="rounded-xl bg-[var(--sgi-red)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sgi-red-deep)] disabled:opacity-60 sm:py-2.5"
            >
              {saving ? "Publication…" : "Enregistrer"}
            </button>
            {remoteSyncEnabled && (
              <button
                type="button"
                onClick={syncRemote}
                className="col-span-2 rounded-xl border border-[var(--sgi-gold)] px-4 py-3 text-sm font-semibold text-[var(--sgi-gold)] transition hover:bg-[var(--sgi-gold)]/10 sm:col-span-1 sm:py-2.5"
              >
                Synchroniser
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
