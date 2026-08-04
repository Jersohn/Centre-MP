import { agendaItems, dailyDirective, galleryItems, goshoPassage, newsItems, stats, testimonials } from "./mockData";
import { fetchLandingContentFromSupabase, saveLandingContentToSupabase } from "./supabaseService";

const STORAGE_KEY = "cmf_landing_content";

type GalleryItem = {
  title: string;
  description: string;
  image: string;
};

type StatItem = {
  label: string;
  value: number;
  suffix: string;
};

type NewsItem = {
  title: string;
  summary: string;
  date: string;
  author: string;
  image: string;
};

type AgendaItem = {
  title: string;
  date: string;
  time: string;
  location: string;
  responsible: string;
};

type TestimonialItem = {
  name: string;
  role: string;
  quote: string;
  image: string;
};

type DirectiveItem = {
  title: string;
  date: string;
  text: string;
  author: string;
};

type GoshoPassage = {
  title: string;
  excerpt: string;
  context: string;
  reference: string;
};

export type LandingContent = {
  heroTitle: string;
  heroParagraph: string;
  heroImage: string;
  aboutText: string;
  aboutImage: string;
  galleryItems: GalleryItem[];
  stats: StatItem[];
  newsItems: NewsItem[];
  agendaItems: AgendaItem[];
  testimonials: TestimonialItem[];
  dailyDirective: DirectiveItem;
  goshoPassage: GoshoPassage;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
};

const defaultContent: LandingContent = {
  heroTitle: "Développer une vie de valeur, bâtir une société de paix.",
  heroParagraph:
    "Grâce à la philosophie humaniste du bouddhisme de Nichiren, le Centre Miroir Parfait accompagne les individus et les communautés vers l’harmonie, la sagesse et l’unité.",
  heroImage: "https://source.unsplash.com/1800x1200/?african,community",
  aboutText:
    "Le centre accompagne les individus et les communautés dans leur cheminement vers la sagesse, la responsabilité et la construction d’un monde plus juste.",
  aboutImage: "https://source.unsplash.com/1200x800/?african,people",
  galleryItems: galleryItems.map((item) => ({
    title: item.title,
    description: item.description,
    image: item.image,
  })),
  stats: stats.map((item) => ({ ...item })),
  newsItems: newsItems.map((item) => ({ ...item })),
  agendaItems: agendaItems.map((item) => ({ ...item })),
  testimonials: testimonials.map((item) => ({ ...item })),
  dailyDirective: { ...dailyDirective },
  goshoPassage: { ...goshoPassage },
  contactEmail: "contact@centremiroirparfait.org",
  contactPhone: "+221 77 000 00 00",
  contactAddress: "Dakar, Sénégal",
};

export function getContent(): LandingContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultContent;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.galleryItems)) {
      return defaultContent;
    }
    return { ...defaultContent, ...parsed };
  } catch (e) {
    return defaultContent;
  }
}

export async function loadContent(): Promise<LandingContent> {
  if (typeof window === "undefined") {
    return getContent();
  }

  try {
    const remoteContent = await fetchLandingContentFromSupabase();
    if (remoteContent) {
      const merged = { ...defaultContent, ...remoteContent };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
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
  const next = { ...current, ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("landing-content-updated", { detail: next }));
  return next;
}

export async function saveContent(partial: Partial<LandingContent>) {
  const next = setContent(partial);
  await saveLandingContentToSupabase(next);
  return next;
}

export function resetContent() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("landing-content-updated", { detail: defaultContent }));
}

export default { getContent, setContent, resetContent };
