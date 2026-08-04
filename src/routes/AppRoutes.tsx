import { Routes, Route, Navigate } from "react-router";
import App from "../app/App";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import AdminEditLanding from "../pages/AdminEditLanding";
import CentreEditLanding from "../pages/CentreEditLanding";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard/admin" element={<App />} />
      <Route path="/dashboard/admin/edit-landing" element={<AdminEditLanding />} />
      <Route path="/dashboard/centre" element={<App />} />
      <Route path="/dashboard/centre/edit-landing" element={<CentreEditLanding />} />
      <Route path="/dashboard/chapitre" element={<App />} />
      <Route path="/dashboard/district" element={<App />} />
      <Route path="/dashboard/groupe" element={<App />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
