import { useEffect } from "react";
import { Header } from "../components/landing/Header";
import { Hero } from "../components/landing/Hero";
import { StatsSection } from "../components/landing/StatsSection";
import { AboutSection } from "../components/landing/AboutSection";
import { GallerySection } from "../components/landing/GallerySection";
import { NewsSection } from "../components/landing/NewsSection";
import { AgendaSection } from "../components/landing/AgendaSection";
import { TestimonialsSection } from "../components/landing/TestimonialsSection";
import { Footer } from "../components/landing/Footer";
import { loadContent } from "../services/contentService";

export function LandingPage() {
  useEffect(() => {
    loadContent();
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Header />
      <main className="page-content">
        <Hero />
        <StatsSection />
        <AboutSection />
        <GallerySection />
        <NewsSection />
        <AgendaSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}
