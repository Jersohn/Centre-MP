import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { GalleryPage } from "../pages/GalleryPage";
import { GalleryDetailPage } from "../pages/GalleryDetailPage";
import { TestimonialsPage } from "../pages/TestimonialsPage";
import { TestimonialDetailPage } from "../pages/TestimonialDetailPage";
import { DailyReadingPage } from "../pages/DailyReadingPage";
import { NewsPage } from "../pages/NewsPage";
import { NewsDetailPage } from "../pages/NewsDetailPage";
import { AgendaPage } from "../pages/AgendaPage";
import { AgendaDetailPage } from "../pages/AgendaDetailPage";

const App = lazy(() => import("../app/App"));
const AdminEditLanding = lazy(() => import("../pages/AdminEditLanding"));

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--sgi-surface,#f3f6fa)] text-sm text-slate-500">
      Chargement…
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/lecture-du-jour" element={<DailyReadingPage />} />
        <Route path="/actualites" element={<NewsPage />} />
        <Route path="/actualites/:id" element={<NewsDetailPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/agenda/:id" element={<AgendaDetailPage />} />
        <Route path="/galerie" element={<GalleryPage />} />
        <Route path="/galerie/:id" element={<GalleryDetailPage />} />
        <Route path="/temoignages" element={<TestimonialsPage />} />
        <Route path="/temoignages/:id" element={<TestimonialDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard/admin" element={<App />} />
        <Route path="/dashboard/admin/edit-landing" element={<AdminEditLanding />} />
        <Route path="/dashboard/centre" element={<App />} />
        <Route path="/dashboard/centre/edit-landing" element={<AdminEditLanding />} />
        <Route path="/dashboard/chapitre" element={<App />} />
        <Route path="/dashboard/district" element={<App />} />
        <Route path="/dashboard/groupe" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
