import { useEffect } from "react";
import { useLocation } from "react-router";
import { Header } from "../components/landing/Header";
import { Hero } from "../components/landing/Hero";
import { DashboardSection } from "../components/landing/DashboardSection";
import { StatsSection } from "../components/landing/StatsSection";
import { AboutSection } from "../components/landing/AboutSection";
import { GallerySection } from "../components/landing/GallerySection";
import { NewsSection } from "../components/landing/NewsSection";
import { AgendaSection } from "../components/landing/AgendaSection";
import { TestimonialsSection } from "../components/landing/TestimonialsSection";
import { Footer } from "../components/landing/Footer";
import { MobileBottomNav } from "../components/landing/MobileBottomNav";
import { InstallBanner } from "../components/landing/InstallBanner";
import { PublicSiteChatbot } from "../components/ai/PublicSiteChatbot";
import { loadContent } from "../services/contentService";
import { scrollToLandingHashWhenReady } from "../utils/landingNav";

export function LandingPage() {
  const location = useLocation();

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    scrollToLandingHashWhenReady(location.hash);
  }, [location.hash, location.key]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />
      <main className="page-content safe-pb">
        <Hero />
        <DashboardSection />
        <StatsSection />
        <AboutSection />
        <GallerySection />
        <NewsSection />
        <AgendaSection />
        <TestimonialsSection />
      </main>
      <Footer />
      <InstallBanner />
      <MobileBottomNav />
      <PublicSiteChatbot />
    </div>
  );
}
