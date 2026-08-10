import { landingImages } from "../assets/landing/images";
import {
  agendaItems,
  centreCommittee as defaultCentreCommittee,
  chapterLeaders as defaultChapterLeaders,
  dailyDirective,
  galleryItems,
  goshoPassage,
  newsItems,
  testimonials,
  thoughtOfDay as defaultThoughtOfDay,
} from "./mockData";
import { fetchLandingContentFromSupabase, saveLandingContentToSupabase } from "./supabaseService";

const STORAGE_KEY = "cmf_landing_content_v21";
const LEGACY_STORAGE_KEYS = [
  "cmf_landing_content_v20",
  "cmf_landing_content_v19",
  "cmf_landing_content_v18",
  "cmf_landing_content_v17",
  "cmf_landing_content_v16",
  "cmf_landing_content_v15",
  "cmf_landing_content_v14",
  "cmf_landing_content_v13",
  "cmf_landing_content_v12",
  "cmf_landing_content_v11",
  "cmf_landing_content_v10",
  "cmf_landing_content_v9",
  "cmf_landing_content_v8",
  "cmf_landing_content_v7",
  "cmf_landing_content_v6",
];

/** Cache mémoire : évite de recharger un localStorage déjà saturé. */
let memoryContent: LandingContent | null = null;

function isDataUrl(value?: string) {
  return typeof value === "string" && value.startsWith("data:");
}

function keepHttpOrEmpty(value: string | undefined, fallback = "") {
  if (!value) return fallback;
  if (isDataUrl(value)) return fallback;
  return value;
}

/** Version légère pour localStorage (jamais de data URL base64). */
function slimContentForLocalStorage(content: LandingContent): LandingContent {
  return {
    ...content,
    heroImage: keepHttpOrEmpty(content.heroImage),
    aboutImage: keepHttpOrEmpty(content.aboutImage),
    heroImages: (content.heroImages || []).map((slide) => ({
      ...slide,
      src: keepHttpOrEmpty(slide.src),
    })),
    centreCommittee: (content.centreCommittee || []).map((item) => ({
      ...item,
      image: keepHttpOrEmpty(item.image),
    })),
    chapterLeaders: (content.chapterLeaders || []).map((item) => ({
      ...item,
      responsibleImage: keepHttpOrEmpty(item.responsibleImage),
    })),
    galleryItems: (content.galleryItems || []).map((item) => ({
      ...item,
      image: keepHttpOrEmpty(item.image),
    })),
    newsItems: (content.newsItems || []).map((item) => ({
      ...item,
      image: keepHttpOrEmpty(item.image),
    })),
    testimonials: (content.testimonials || []).map((item) => ({
      ...item,
      image: keepHttpOrEmpty(item.image),
    })),
  };
}

function clearLegacyLandingStorage() {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

function persistLocalContent(content: LandingContent) {
  if (typeof window === "undefined") return;
  const slim = slimContentForLocalStorage(content);
  const payload = JSON.stringify(slim);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    clearLegacyLandingStorage();
  } catch {
    // Quota dépassé : libère l’ancien cache et réessaie une fois.
    try {
      clearLegacyLandingStorage();
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      console.warn(
        "[landing-content] Impossible d’écrire dans localStorage (quota). Le contenu reste en mémoire / Supabase.",
        err,
      );
    }
  }
}

/** Détecte un texte UTF-8 corrompu (mojibake / caractères de remplacement). */
function isBrokenEncoding(value?: string) {
  if (!value) return false;
  return value.includes("\uFFFD") || /Ã.|Â.|�/.test(value);
}

function pickText(raw: string | undefined, fallback: string) {
  if (typeof raw !== "string" || !raw.trim() || isBrokenEncoding(raw)) return fallback;
  return raw.trim();
}

export type GalleryItem = {
  id: string;
  title: string;
  description: string;
  image: string;
  date?: string;
  location?: string;
  chapter?: string;
  category?: string;
  content?: string;
  highlights?: string[];
};

export type StatItem = {
  label: string;
  value: number;
  suffix: string;
};

export type LeaderItem = {
  id: string;
  name: string;
  role: string;
  image: string;
};

export type ChapterLeaderItem = {
  id: string;
  name: string;
  description: string;
  responsibleName: string;
  responsibleRole: string;
  responsibleImage: string;
  stats: StatItem[];
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  date: string;
  author: string;
  image: string;
  content?: string;
  location?: string;
  category?: string;
};

export type AgendaItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  responsible: string;
  description?: string;
  content?: string;
};

export type TestimonialItem = {
  id: string;
  name: string;
  role: string;
  quote: string;
  image: string;
  chapter?: string;
  location?: string;
  memberSince?: string;
  fullStory?: string;
  themes?: string[];
};

export type DirectiveItem = {
  title: string;
  date: string;
  text: string;
  author: string;
  image?: string;
  fullText?: string;
  reflection?: string;
  source?: string;
};

export type GoshoPassage = {
  title: string;
  excerpt: string;
  context: string;
  reference: string;
  goshoTitle?: string;
  fullText?: string;
  reflection?: string;
  source?: string;
};

export type HeroSlide = {
  src: string;
  alt: string;
};

export type LandingContent = {
  heroTitle: string;
  heroParagraph: string;
  heroImage: string;
  /** Images du slider d’accueil (arrière-plan). */
  heroImages: HeroSlide[];
  aboutText: string;
  aboutImage: string;
  /** Comité du centre (responsables). */
  centreCommittee: LeaderItem[];
  /** Responsables de chaque chapitre + statistiques. */
  chapterLeaders: ChapterLeaderItem[];
  galleryItems: GalleryItem[];
  stats: StatItem[];
  newsItems: NewsItem[];
  agendaItems: AgendaItem[];
  testimonials: TestimonialItem[];
  dailyDirective: DirectiveItem;
  goshoPassage: GoshoPassage;
  /** Si true, l’encouragement admin remplace l’API. */
  useManualEncouragement: boolean;
  /** Si true, le Gosho admin remplace l’API. */
  useManualGosho: boolean;
  thoughtOfDay: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
};

function slugify(value: string, fallback: string) {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
}

function normalizeGalleryItem(item: Partial<GalleryItem>, index: number): GalleryItem {
  const title = item.title || `Galerie ${index + 1}`;
  const fallbackImage =
    [
      landingImages.gallery.shakubuku,
      landingImages.gallery.meeting,
      landingImages.gallery.daimoku,
      landingImages.gallery.chapter,
      landingImages.gallery.jeunesseRissho,
    ][index % 5] || landingImages.gallery.meeting;
  return {
    id: item.id || slugify(title, `galerie-${index + 1}`),
    title,
    description: item.description || "",
    image: item.image || fallbackImage,
    date: item.date,
    location: item.location,
    chapter: item.chapter,
    category: item.category,
    content: item.content || item.description || "",
    highlights: item.highlights || [],
  };
}

function normalizeGalleryItems(raw: Partial<LandingContent>): GalleryItem[] {
  const defaults = galleryItems.map((item, index) => normalizeGalleryItem(item, index));
  if (!Array.isArray(raw.galleryItems) || raw.galleryItems.length === 0) {
    return defaults;
  }
  // Contenu CMS prioritaire — ne plus forcer le jeu mock.
  return raw.galleryItems.map((item, index) => normalizeGalleryItem(item, index));
}

function normalizeTestimonialItem(item: Partial<TestimonialItem>, index: number): TestimonialItem {
  const name = item.name || `Témoignage ${index + 1}`;
  return {
    id: item.id || slugify(name, `temoignage-${index + 1}`),
    name,
    role: item.role || "",
    quote: item.quote || "",
    image: item.image || landingImages.testimonials.man,
    chapter: item.chapter,
    location: item.location,
    memberSince: item.memberSince,
    fullStory: item.fullStory || item.quote || "",
    themes: item.themes || [],
  };
}

function normalizeNewsItem(item: Partial<NewsItem>, index: number): NewsItem {
  const title = item.title?.trim() || `Actualité ${index + 1}`;
  const summary = item.summary?.trim() || "";
  const image =
    item.image && !String(item.image).includes("images.unsplash.com")
      ? item.image
      : index % 2 === 0
        ? landingImages.news.training
        : landingImages.news.community;

  return {
    id: item.id || slugify(title, `actualite-${index + 1}`),
    title,
    summary,
    date: item.date?.trim() || "",
    author: item.author?.trim() || "Centre Miroir Parfait",
    image,
    content: item.content?.trim() || summary,
    location: item.location?.trim() || "Abidjan, Côte d’Ivoire",
    category: item.category?.trim() || "Actualité",
  };
}

function normalizeAgendaItem(item: Partial<AgendaItem>, index = 0): AgendaItem {
  const title = item.title?.trim() || "Événement";
  const description = item.description?.trim() || "";
  return {
    id: item.id || slugify(title, `agenda-${index + 1}`),
    title,
    date: item.date?.trim() || "",
    time: item.time?.trim() || "",
    location: item.location?.trim() || "",
    responsible: item.responsible?.trim() || "",
    description,
    content: item.content?.trim() || description,
  };
}

/** Les entrées les plus récentes sont en fin de liste (ajout admin). */
export function getLatestAgendaItems(items: AgendaItem[], limit = 5): AgendaItem[] {
  return [...items].slice(-limit).reverse();
}

/** Agrège les indicateurs du centre à partir des statistiques des chapitres. */
export function buildCentreStatsFromChapters(chapters: ChapterLeaderItem[]): StatItem[] {
  const sumByLabel = (label: string) =>
    chapters.reduce((total, chapter) => {
      const match = chapter.stats.find((stat) => stat.label.trim().toLowerCase() === label.toLowerCase());
      return total + (Number(match?.value) || 0);
    }, 0);

  const membersHavePlus = chapters.some((chapter) =>
    chapter.stats.some((stat) => /membres/i.test(stat.label) && String(stat.suffix || "").includes("+")),
  );

  return [
    { label: "Chapitres", value: chapters.length, suffix: "" },
    { label: "Districts", value: sumByLabel("Districts"), suffix: "" },
    { label: "Groupes", value: sumByLabel("Groupes"), suffix: "" },
    { label: "Membres", value: sumByLabel("Membres"), suffix: membersHavePlus ? "+" : "" },
  ];
}

const defaultChapterLeadersNormalized = defaultChapterLeaders.map((item) => ({
  ...item,
  stats: item.stats
    .filter((stat) => !/sous[-\s]?groupe/i.test(stat.label || ""))
    .map((stat) => ({ ...stat })),
}));

const defaultContent: LandingContent = {
  heroTitle: "Développer une vie de valeur, bâtir une société de paix.",
  heroParagraph:
    "Grâce à la philosophie humaniste du bouddhisme de Nichiren, le Centre Miroir Parfait accompagne les individus et les communautés de Côte d’Ivoire vers l’harmonie, la sagesse et l’unité.",
  heroImage: landingImages.hero,
  heroImages: landingImages.heroSlides.map((slide) => ({ ...slide })),
  aboutText:
    "Le Centre Miroir Parfait appartient à la Région générale Terre de Victoire, à la Région Myoren et au Centre général Osaka. Il regroupe trois chapitres — Rissho Ankoku Ron, Shin Gyo Gaku et Trois Trésors — et accompagne les membres vers la sagesse, la responsabilité et la construction d’un monde plus juste.",
  aboutImage: landingImages.about,
  centreCommittee: defaultCentreCommittee.map((item) => ({ ...item })),
  chapterLeaders: defaultChapterLeadersNormalized,
  galleryItems: galleryItems.map((item, index) => normalizeGalleryItem(item, index)),
  stats: buildCentreStatsFromChapters(defaultChapterLeadersNormalized),
  newsItems: newsItems.map((item, index) => normalizeNewsItem(item, index)),
  agendaItems: agendaItems.map((item, index) => normalizeAgendaItem(item, index)),
  testimonials: testimonials.map((item, index) => normalizeTestimonialItem(item, index)),
  dailyDirective: { ...dailyDirective, title: "Encouragement du jour" },
  goshoPassage: { ...goshoPassage },
  useManualEncouragement: false,
  useManualGosho: false,
  thoughtOfDay: defaultThoughtOfDay,
  contactEmail: "contact@centremiroirparfait.ci",
  contactPhone: "+225 07 00 00 00 00",
  contactAddress: "Abidjan, Côte d’Ivoire",
};

function isManagedImage(src?: string) {
  if (!src) return false;
  return (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    /^https?:\/\//i.test(src)
  );
}

function normalizeHeroImages(raw: Partial<LandingContent>): HeroSlide[] {
  const defaults = defaultContent.heroImages.map((slide) => ({ ...slide }));

  if (Array.isArray(raw.heroImages) && raw.heroImages.length > 0) {
    const slides = raw.heroImages
      .map((slide, index) => ({
        src: String(slide?.src || "").trim(),
        alt: String(slide?.alt || `Bannière ${index + 1}`).trim() || `Bannière ${index + 1}`,
      }))
      .filter((slide) => Boolean(slide.src));
    if (slides.length > 0) return slides;
  }

  // Compat : ancienne bannière unique → 1ʳᵉ slide
  if (isManagedImage(raw.heroImage)) {
    return [{ src: raw.heroImage as string, alt: "Bannière principale" }, ...defaults.slice(1)];
  }

  return defaults;
}

function normalizeAboutImage(raw: Partial<LandingContent>) {
  if (isManagedImage(raw.aboutImage)) return raw.aboutImage as string;
  return landingImages.about;
}

function normalizeLeaderItem(item: Partial<LeaderItem>, index: number, fallback: LeaderItem): LeaderItem {
  return {
    id: item.id || fallback.id || `leader-${index + 1}`,
    name: item.name?.trim() || fallback.name,
    role: item.role?.trim() || fallback.role,
    image: resolveManagedImage(item.image, fallback.image),
  };
}

function resolveManagedImage(stored: string | undefined, fallback: string): string {
  if (!stored) return fallback;
  // Keep admin uploads / remote URLs; refresh bundled asset hashes after redeploy.
  if (stored.startsWith("data:") || /^https?:\/\//i.test(stored)) return stored;
  return fallback;
}

function normalizeChapterStats(stats: StatItem[] | undefined, fallback: StatItem[]): StatItem[] {
  const source = Array.isArray(stats) && stats.length > 0 ? stats : fallback;
  const cleaned = source
    .filter((stat) => !/sous[-\s]?groupe/i.test(stat.label || ""))
    .map((stat) => ({
      label: stat.label || "",
      value: Number(stat.value) || 0,
      suffix: stat.suffix ?? "",
    }));

  // Remplace les anciens chiffres démo (membres gonflés / anciennes répartitions groupes).
  const storedMembers = cleaned.find((stat) => /membres/i.test(stat.label))?.value ?? 0;
  const storedGroups = cleaned.find((stat) => /groupes/i.test(stat.label))?.value ?? 0;
  const obsoleteGroupCounts = new Set([10, 11, 12, 14, 16, 18]);
  if (storedMembers >= 200 || obsoleteGroupCounts.has(storedGroups)) {
    return fallback.map((stat) => ({ ...stat }));
  }

  return cleaned;
}

function normalizeChapterLeaderItem(
  item: Partial<ChapterLeaderItem>,
  index: number,
  fallback: ChapterLeaderItem,
): ChapterLeaderItem {
  return {
    id: item.id || fallback.id || `chapitre-${index + 1}`,
    name: item.name?.trim() || fallback.name,
    description: item.description?.trim() || fallback.description,
    responsibleName: item.responsibleName?.trim() || fallback.responsibleName,
    responsibleRole: item.responsibleRole?.trim() || fallback.responsibleRole,
    responsibleImage: resolveManagedImage(item.responsibleImage, fallback.responsibleImage),
    stats: normalizeChapterStats(item.stats, fallback.stats),
  };
}

function normalizeCentreCommittee(raw: Partial<LandingContent>): LeaderItem[] {
  const defaults = defaultContent.centreCommittee;
  if (!Array.isArray(raw.centreCommittee) || raw.centreCommittee.length === 0) {
    return defaults.map((item) => ({ ...item }));
  }
  return defaults.map((fallback, index) =>
    normalizeLeaderItem(raw.centreCommittee?.[index] || fallback, index, fallback),
  );
}

function normalizeChapterLeaders(raw: Partial<LandingContent>): ChapterLeaderItem[] {
  const defaults = defaultContent.chapterLeaders;
  if (!Array.isArray(raw.chapterLeaders) || raw.chapterLeaders.length === 0) {
    return defaults.map((item) => ({
      ...item,
      stats: item.stats.map((stat) => ({ ...stat })),
    }));
  }
  return defaults.map((fallback, index) =>
    normalizeChapterLeaderItem(raw.chapterLeaders?.[index] || fallback, index, fallback),
  );
}

function normalizeContent(raw: Partial<LandingContent>): LandingContent {
  const chapterLeaders = normalizeChapterLeaders(raw);
  const heroImages = normalizeHeroImages(raw);
  return {
    ...defaultContent,
    ...raw,
    heroTitle: pickText(raw.heroTitle, defaultContent.heroTitle),
    heroParagraph: pickText(raw.heroParagraph, defaultContent.heroParagraph),
    heroImages,
    heroImage: heroImages[0]?.src || defaultContent.heroImage,
    aboutText: pickText(raw.aboutText, defaultContent.aboutText),
    aboutImage: normalizeAboutImage(raw),
    centreCommittee: normalizeCentreCommittee(raw),
    chapterLeaders,
    stats: buildCentreStatsFromChapters(chapterLeaders),
    dailyDirective: { ...defaultContent.dailyDirective, ...(raw.dailyDirective || {}) },
    goshoPassage: { ...defaultContent.goshoPassage, ...(raw.goshoPassage || {}) },
    useManualEncouragement: Boolean(raw.useManualEncouragement),
    useManualGosho: Boolean(raw.useManualGosho),
    thoughtOfDay:
      typeof raw.thoughtOfDay === "string" && raw.thoughtOfDay.trim()
        ? raw.thoughtOfDay.trim()
        : defaultContent.thoughtOfDay,
    newsItems:
      Array.isArray(raw.newsItems) && raw.newsItems.length > 0
        ? raw.newsItems.map((item, index) => normalizeNewsItem(item, index))
        : defaultContent.newsItems,
    agendaItems:
      Array.isArray(raw.agendaItems) && raw.agendaItems.length > 0
        ? raw.agendaItems.map((item, index) => normalizeAgendaItem(item, index))
        : defaultContent.agendaItems,
    galleryItems: normalizeGalleryItems(raw),
    testimonials:
      Array.isArray(raw.testimonials) && raw.testimonials.length > 0
        ? raw.testimonials.map((item, index) => normalizeTestimonialItem(item, index))
        : defaultContent.testimonials,
    contactEmail: pickText(raw.contactEmail, defaultContent.contactEmail),
    contactPhone: pickText(raw.contactPhone, defaultContent.contactPhone),
    contactAddress: pickText(raw.contactAddress, defaultContent.contactAddress),
  };
}

export function getContent(): LandingContent {
  if (memoryContent) return memoryContent;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) {
      memoryContent = defaultContent;
      return defaultContent;
    }
    // Cache saturé (souvent d’anciennes images base64) → on le purge.
    if (raw.length > 1_500_000 || raw.includes("data:image")) {
      const parsed = normalizeContent(JSON.parse(raw));
      memoryContent = slimContentForLocalStorage(parsed);
      persistLocalContent(memoryContent);
      return memoryContent;
    }
    memoryContent = normalizeContent(JSON.parse(raw));
    return memoryContent;
  } catch {
    try {
      clearLegacyLandingStorage();
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    memoryContent = defaultContent;
    return defaultContent;
  }
}

export function getGalleryItemById(id: string): GalleryItem | undefined {
  return getContent().galleryItems.find((item) => item.id === id);
}

export function getTestimonialById(id: string): TestimonialItem | undefined {
  return getContent().testimonials.find((item) => item.id === id);
}

export function getNewsItemById(id: string): NewsItem | undefined {
  return getContent().newsItems.find((item) => item.id === id);
}

export function getAgendaItemById(id: string): AgendaItem | undefined {
  return getContent().agendaItems.find((item) => item.id === id);
}

export async function loadContent(): Promise<LandingContent> {
  if (typeof window === "undefined") {
    return getContent();
  }

  try {
    const remoteContent = await fetchLandingContentFromSupabase();
    if (remoteContent) {
      const merged = normalizeContent(remoteContent);
      memoryContent = merged;
      persistLocalContent(merged);
      window.dispatchEvent(new CustomEvent("landing-content-updated", { detail: merged }));
      return merged;
    }
  } catch {
    // ignore and fallback to local content
  }

  return getContent();
}

export function setContent(partial: Partial<LandingContent>) {
  const current = getContent();
  const next = normalizeContent({ ...current, ...partial });
  memoryContent = next;
  persistLocalContent(next);
  window.dispatchEvent(new CustomEvent("landing-content-updated", { detail: next }));
  return next;
}

export async function saveContent(partial: Partial<LandingContent>) {
  const next = setContent(partial);
  const hasEmbedded =
    JSON.stringify(next).includes("data:image") ||
    (next.galleryItems || []).some((item) => isDataUrl(item.image)) ||
    (next.heroImages || []).some((slide) => isDataUrl(slide.src));
  if (hasEmbedded) {
    throw new Error(
      "Des images locales (base64) bloquent la publication. Retéléversez-les pour obtenir une URL Storage, puis republiez.",
    );
  }
  const result = await saveLandingContentToSupabase(next);
  if (result?.error) {
    throw new Error(result.error.message || "Échec de la sauvegarde.");
  }
  return next;
}

export function resetContent() {
  memoryContent = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    clearLegacyLandingStorage();
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("landing-content-updated", { detail: defaultContent }));
}

export default {
  getContent,
  setContent,
  resetContent,
  getGalleryItemById,
  getTestimonialById,
  getNewsItemById,
  getAgendaItemById,
  getLatestAgendaItems,
};
