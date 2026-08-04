import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { parseISO, format } from "date-fns";
import {
  LayoutDashboard, Users, Wallet, FileText, BarChart3,
  Bell, Search, Plus, Filter, Eye, Edit2, UserX,
  Download, ChevronRight, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, TrendingUp,
  CheckCircle, Clock, XCircle, Send, Globe, BookOpen,
  Calendar, Target, X, Menu, LogOut, Settings, Layers,
  ChevronLeft
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from "recharts";
import sgiLogo from "../../image/logo-sgi.jpg";
import { createMemberFromForm } from "./memberFormUtils";
import AdminEditLanding from "../pages/AdminEditLanding";
import CentreEditLanding from "../pages/CentreEditLanding";
import { ALLOWED_ROLES, MODULE_ACCESS, ROLE_LABELS, type PlatformRole } from "./roles";

// ─── Data ────────────────────────────────────────────────────────────────────

const CHAPITRES = ["Tous", "Chapitre 1 – Kinshasa", "Chapitre 2 – Brazzaville", "Chapitre 3 – Paris", "Chapitre 4 – Abidjan"];
const DISTRICTS = ["Tous", "District Nord", "District Sud", "District Est", "District Ouest"];
const STATUTS = ["Tous", "Actif", "En attente", "Suspendu"];

const membres = [
  { id: 1, nom: "Kabongo Mwamba", prenom: "Jean-Pierre", email: "jp.kabongo@email.com", telephone: "+243 81 234 5678", dateNaissance: "1992-03-15", departement: "Administration", categorie: "Homme", responsabilite: "Responsable centre", dateDebutPratique: "2015-04-01", abonnementVaguePaix: true, quartier: "Gombe", chapitre: "Chapitre 1 – Kinshasa", district: "District Nord", statut: "Actif", cotisation: "À jour", adhesion: "2019-03-15", abonnement: true, totalCotisations: 480000, totalDons: 120000 },
  { id: 2, nom: "Mbeki Nkosi", prenom: "Amara", email: "amara.mbeki@email.com", telephone: "+242 06 789 0123", dateNaissance: "1997-07-22", departement: "Culture", categorie: "Femme", responsabilite: "Responsable chapitre", dateDebutPratique: "2018-08-10", abonnementVaguePaix: true, quartier: "Poto-Poto", chapitre: "Chapitre 2 – Brazzaville", district: "District Sud", statut: "Actif", cotisation: "À jour", adhesion: "2020-07-22", abonnement: true, totalCotisations: 360000, totalDons: 85000 },
  { id: 3, nom: "Fontaine", prenom: "Cécile", email: "c.fontaine@email.fr", telephone: "+33 6 12 34 56 78", dateNaissance: "2001-01-10", departement: "Jeunesse", categorie: "Jeune fille", responsabilite: "Membre", dateDebutPratique: "2021-02-01", abonnementVaguePaix: false, quartier: "Belleville", chapitre: "Chapitre 3 – Paris", district: "District Ouest", statut: "Actif", cotisation: "En retard", adhesion: "2021-01-10", abonnement: false, totalCotisations: 240000, totalDons: 45000 },
  { id: 4, nom: "Konaté", prenom: "Ibrahim", email: "i.konate@email.ci", telephone: "+225 07 456 7890", dateNaissance: "2004-11-03", departement: "Avenir", categorie: "Jeune homme", responsabilite: "Membre", dateDebutPratique: "2023-01-15", abonnementVaguePaix: false, quartier: "Plateau", chapitre: "Chapitre 4 – Abidjan", district: "District Est", statut: "En attente", cotisation: "Non renseigné", adhesion: "2023-11-03", abonnement: false, totalCotisations: 60000, totalDons: 10000 },
  { id: 5, nom: "Tshisekedi Wa", prenom: "Marie-Claire", email: "mc.tshisekedi@email.com", telephone: "+243 99 876 5432", dateNaissance: "1990-06-28", departement: "Éducation", categorie: "Femme", responsabilite: "Responsable district", dateDebutPratique: "2012-09-01", abonnementVaguePaix: true, quartier: "Kalamu", chapitre: "Chapitre 1 – Kinshasa", district: "District Nord", statut: "Actif", cotisation: "À jour", adhesion: "2018-06-28", abonnement: true, totalCotisations: 720000, totalDons: 200000 },
  { id: 6, nom: "Diallo", prenom: "Ousmane", email: "o.diallo@email.ci", telephone: "+225 05 111 2233", dateNaissance: "1988-02-14", departement: "Santé", categorie: "Homme", responsabilite: "Responsable groupe", dateDebutPratique: "2010-03-01", abonnementVaguePaix: false, quartier: "Yopougon", chapitre: "Chapitre 4 – Abidjan", district: "District Nord", statut: "Suspendu", cotisation: "En retard", adhesion: "2020-02-14", abonnement: false, totalCotisations: 180000, totalDons: 0 },
  { id: 7, nom: "Ngandu", prenom: "Patrick", email: "p.ngandu@email.com", telephone: "+243 82 333 4444", dateNaissance: "1995-09-05", departement: "Logistique", categorie: "Homme", responsabilite: "Responsable groupe", dateDebutPratique: "2017-10-01", abonnementVaguePaix: true, quartier: "Lingwala", chapitre: "Chapitre 1 – Kinshasa", district: "District Sud", statut: "Actif", cotisation: "À jour", adhesion: "2022-09-05", abonnement: true, totalCotisations: 300000, totalDons: 75000 },
  { id: 8, nom: "Lemaire", prenom: "Sophie", email: "s.lemaire@email.fr", telephone: "+33 7 88 99 00 11", dateNaissance: "1994-04-19", departement: "Communication", categorie: "Femme", responsabilite: "Responsable chapitre", dateDebutPratique: "2016-05-01", abonnementVaguePaix: true, quartier: "Montreuil", chapitre: "Chapitre 3 – Paris", district: "District Ouest", statut: "Actif", cotisation: "À jour", adhesion: "2021-04-19", abonnement: true, totalCotisations: 420000, totalDons: 95000 },
  { id: 9, nom: "Bakary", prenom: "Moussa", email: "m.bakary@email.cg", telephone: "+242 05 678 9012", dateNaissance: "1998-12-01", departement: "Avenir", categorie: "Jeune homme", responsabilite: "Membre", dateDebutPratique: "2022-01-01", abonnementVaguePaix: false, quartier: "Moungali", chapitre: "Chapitre 2 – Brazzaville", district: "District Est", statut: "Actif", cotisation: "À jour", adhesion: "2019-12-01", abonnement: false, totalCotisations: 540000, totalDons: 110000 },
  { id: 10, nom: "Deschamps", prenom: "Laurent", email: "l.deschamps@email.fr", telephone: "+33 6 55 44 33 22", dateNaissance: "2002-01-15", departement: "Jeunesse", categorie: "Jeune homme", responsabilite: "Membre", dateDebutPratique: "2024-02-01", abonnementVaguePaix: false, quartier: "Nanterre", chapitre: "Chapitre 3 – Paris", district: "District Nord", statut: "En attente", cotisation: "Non renseigné", adhesion: "2024-01-15", abonnement: false, totalCotisations: 30000, totalDons: 5000 },
];

const cotisationsMensuelles = [
  { mois: "Fév", montant: 2850000, membres: 84 },
  { mois: "Mar", montant: 3120000, membres: 89 },
  { mois: "Avr", montant: 2940000, membres: 87 },
  { mois: "Mai", montant: 3450000, membres: 94 },
  { mois: "Jui", montant: 3780000, membres: 98 },
  { mois: "Jul", montant: 4120000, membres: 103 },
];

const donsZaimu = [
  { name: "Développement", value: 42, color: "var(--sgi-blue)" },
  { name: "Solidarité", value: 28, color: "var(--sgi-gold)" },
  { name: "Éducation", value: 18, color: "var(--sgi-forest)" },
  { name: "Santé", value: 12, color: "var(--sgi-red)" },
];

const membresByChap = [
  { chapitre: "Ch. 1\nKinshasa", membres: 312, cotisations: 18600000, dons: 4200000 },
  { chapitre: "Ch. 2\nBrazza.", membres: 198, cotisations: 11880000, dons: 2850000 },
  { chapitre: "Ch. 3\nParis", membres: 145, cotisations: 8700000, dons: 1900000 },
  { chapitre: "Ch. 4\nAbidjan", membres: 87, cotisations: 5220000, dons: 980000 },
];

const transactions = [
  { id: "TXN-2024-0891", date: "2024-07-28", membre: "Tshisekedi Wa M-C.", type: "Cotisation", montant: 60000, statut: "Validé", chapitre: "Chapitre 1 – Kinshasa" },
  { id: "TXN-2024-0890", date: "2024-07-27", membre: "Kabongo Mwamba J-P.", type: "Don Zaimu", montant: 25000, statut: "Validé", chapitre: "Chapitre 1 – Kinshasa" },
  { id: "TXN-2024-0889", date: "2024-07-26", membre: "Lemaire Sophie", type: "Abonnement", montant: 15000, statut: "Validé", chapitre: "Chapitre 3 – Paris" },
  { id: "TXN-2024-0888", date: "2024-07-25", membre: "Mbeki Nkosi Amara", type: "Cotisation", montant: 60000, statut: "Validé", chapitre: "Chapitre 2 – Brazzaville" },
  { id: "TXN-2024-0887", date: "2024-07-24", membre: "Fontaine Cécile", type: "Cotisation", montant: 60000, statut: "En attente", chapitre: "Chapitre 3 – Paris" },
  { id: "TXN-2024-0886", date: "2024-07-23", membre: "Ngandu Patrick", type: "Don Zaimu", montant: 10000, statut: "Validé", chapitre: "Chapitre 1 – Kinshasa" },
  { id: "TXN-2024-0885", date: "2024-07-22", membre: "Bakary Moussa", type: "Cotisation", montant: 60000, statut: "Validé", chapitre: "Chapitre 2 – Brazzaville" },
  { id: "TXN-2024-0884", date: "2024-07-21", membre: "Diallo Ousmane", type: "Cotisation", montant: 60000, statut: "Rejeté", chapitre: "Chapitre 4 – Abidjan" },
];

const directives = [
  {
    id: 1, titre: "Convocation — Assemblée Générale Extraordinaire", date: "2024-07-28", auteur: "Secrétariat Général",
    audience: "Tous les chapitres", priorite: "Haute", statut: "Publié",
    contenu: "Les membres sont convoqués en Assemblée Générale Extraordinaire le 15 août 2024 à 10h00 (heure de Kinshasa). La réunion se tiendra simultanément en présentiel au Siège et en visioconférence. Ordre du jour : révision des statuts, élection du nouveau bureau exécutif, présentation du bilan financier semestriel."
  },
  {
    id: 2, titre: "Rappel — Clôture des cotisations du 2e trimestre", date: "2024-07-20", auteur: "Direction Finances",
    audience: "Chapitre 3 – Paris, Chapitre 4 – Abidjan", priorite: "Normale", statut: "Publié",
    contenu: "La date limite de versement des cotisations du deuxième trimestre 2024 est fixée au 31 juillet 2024. Passé ce délai, les membres en situation de retard seront notifiés individuellement et leur statut sera mis à jour en conséquence."
  },
  {
    id: 3, titre: "Lancement de la campagne Vague de Paix — Saison 4", date: "2024-07-15", auteur: "Commission Culturelle",
    audience: "Tous les chapitres", priorite: "Haute", statut: "Publié",
    contenu: "La quatrième saison de l'abonnement Vague de Paix est officiellement ouverte. Les membres souhaitant s'abonner peuvent le faire auprès de leur responsable de chapitre ou via le portail en ligne. Tarif : 15 000 CDF / 15 EUR / 5 000 FCFA par mois."
  },
  {
    id: 4, titre: "Note interne — Procédures d'admission révisées", date: "2024-07-08", auteur: "Commission Adhésion",
    audience: "Chapitre 1 – Kinshasa, Chapitre 2 – Brazzaville", priorite: "Normale", statut: "Publié",
    contenu: "Suite à la révision du règlement intérieur, les nouvelles procédures d'admission entrent en vigueur le 1er août 2024. Chaque candidature devra désormais être accompagnée d'une lettre de parrainage d'un membre en règle."
  },
  {
    id: 5, titre: "Annonce — Programme de formation des responsables", date: "2024-07-01", auteur: "Direction Générale",
    audience: "Tous les chapitres", priorite: "Basse", statut: "Brouillon",
    contenu: "Un programme de formation intensif à destination des responsables de chapitres et de districts sera organisé en septembre 2024. Les modalités seront communiquées prochainement."
  },
];

type ModuleKey = "dashboard" | "membres" | "finances" | "directives" | "statistiques" | "settings";
type ProfileStatus = "Actif" | "En attente" | "Suspendu";

interface Profile {
  id: number;
  name: string;
  email: string;
  role: PlatformRole;
  status: ProfileStatus;
  chapitre: string;
  department: string;
}

const INITIAL_PROFILES: Profile[] = [
  { id: 1, name: "Amina Kasongo", email: "amina.kasongo@sgi.org", role: "admin", status: "Actif", chapitre: "Siège international", department: "Direction générale" },
  { id: 2, name: "Jean-Michel Luyeye", email: "jm.luyeye@sgi.org", role: "centre", status: "Actif", chapitre: "Centre principal", department: "Administration" },
  { id: 3, name: "Eric Mbenza", email: "eric.mbenza@sgi.org", role: "chapitre", status: "Actif", chapitre: "Chapitre 2 – Brazzaville", department: "Coordination" },
  { id: 4, name: "Clara Ndaye", email: "clara.ndaye@sgi.org", role: "district", status: "Actif", chapitre: "Chapitre 3 – Paris", department: "District" },
  { id: 5, name: "Josephine Mbala", email: "josephine.mbala@sgi.org", role: "groupe", status: "En attente", chapitre: "Chapitre 4 – Abidjan", department: "Groupe" },
];

const RBAC_MATRIX = [
  { module: "Tableau de bord", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: true } },
  { module: "Membres", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: true } },
  { module: "Finances", roles: { admin: true, centre: false, chapitre: false, district: false, groupe: false } },
  { module: "Directives", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: true } },
  { module: "Statistiques", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: true } },
  { module: "Paramètres", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: true } },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function SgiOfficialLogo({ className }: { className?: string }) {
  return (
    <img
      src={sgiLogo}
      alt="Logo officiel SGI"
      className={className}
      loading="eager"
    />
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    "Actif": "bg-emerald-50 text-emerald-700 border border-emerald-200",
    "En attente": "bg-amber-50 text-amber-700 border border-amber-200",
    "Suspendu": "bg-red-50 text-red-600 border border-red-200",
    "Validé": "bg-emerald-50 text-emerald-700 border border-emerald-200",
    "Rejeté": "bg-red-50 text-red-600 border border-red-200",
    "Publié": "bg-blue-50 text-blue-700 border border-blue-200",
    "Brouillon": "bg-gray-100 text-gray-500 border border-gray-200",
    "À jour": "bg-emerald-50 text-emerald-700 border border-emerald-200",
    "En retard": "bg-red-50 text-red-600 border border-red-200",
    "Non renseigné": "bg-gray-100 text-gray-500 border border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[statut] || "bg-gray-100 text-gray-500"}`}>
      {statut}
    </span>
  );
}

function PrioriteBadge({ priorite }: { priorite: string }) {
  const map: Record<string, string> = {
    "Haute": "bg-red-50 text-red-600 border border-red-200",
    "Normale": "bg-blue-50 text-blue-700 border border-blue-200",
    "Basse": "bg-gray-100 text-gray-500 border border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[priorite] || ""}`}>
      {priorite}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    "Cotisation": "bg-primary/10 text-primary",
    "Don Zaimu": "bg-accent/10 text-accent",
    "Abonnement": "bg-purple-50 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[type] || "bg-gray-100 text-gray-500"}`}>
      {type}
    </span>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function SgiEmblem({ className }: { className?: string }) {
  return (
    <img
      src={sgiLogo}
      alt="Émblème SGI"
      className={className}
      loading="eager"
    />
  );
}

function KpiCard({ label, value, sub, icon: Icon, trend, color }: {
  label: string; value: string; sub: string; icon: any; trend?: number; color: string;
}) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{value}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      </div>
      <div className="text-xs text-muted-foreground border-t border-border pt-2">{sub}</div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const NAV = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "statistiques", label: "Statistiques", icon: BarChart3 },
  { key: "membres", label: "Membres", icon: Users },
  { key: "finances", label: "Finances", icon: Wallet },
  { key: "directives", label: "Directives", icon: FileText },
  { key: "contenu", label: "Contenu", icon: FileText },
  { key: "settings", label: "Paramètres", icon: Settings },
];

function Sidebar({ active, setActive, collapsed, setCollapsed, allowedModules, onOpenSettings, onLogout }: {
  active: string; setActive: (k: ModuleKey) => void; collapsed: boolean; setCollapsed: (v: boolean) => void; allowedModules: ModuleKey[]; onOpenSettings: () => void; onLogout: () => void;
}) {
  const visibleNav = NAV.filter(({ key }) => allowedModules.includes(key as ModuleKey));
  const navigate = useNavigate();
  const role = typeof window !== "undefined" ? window.localStorage.getItem("sgi-current-role") : null;
  return (
    <aside
      className="hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 select-none"
      style={{ width: collapsed ? 64 : 240, background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Logo */}
      <div className="border-b" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center justify-center px-4 py-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-white/15" style={{ background: "linear-gradient(135deg, rgba(217,161,26,0.95), rgba(163,59,45,0.9))" }}>
            <SgiEmblem className="w-10 h-10 object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0 ml-3">
              <div className="text-white text-sm font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontFamily: "var(--font-display)" }}>Soka Gakkai International</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[10px] text-[var(--sidebar-foreground)]" style={{ opacity: 0.88 }}>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 whitespace-nowrap">
                  <span className="flex items-center justify-center w-4 h-4 rounded-sm overflow-hidden border border-white/10 bg-slate-900">
                    <span className="block w-1 h-full bg-[#F77F00]" />
                    <span className="block w-1 h-full bg-white" />
                    <span className="block w-1 h-full bg-[#138808]" />
                  </span>
                  <span className="font-medium text-[11px] text-white">Côte d’Ivoire</span>
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] text-white/80 whitespace-nowrap">
                  Centre Miroir Parfait
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center pb-4">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-white/15 bg-white/15 text-white shadow-sm transition hover:bg-white/25"
            style={{ color: "var(--sidebar-foreground)" }}
            aria-label={collapsed ? "Déployer la barre latérale" : "Réduire la barre latérale"}
            title={collapsed ? "Déployer la barre latérale" : "Réduire la barre latérale"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-0.5 px-2 overflow-y-auto">
        {visibleNav.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full ${collapsed ? "justify-center" : ""}`}
              style={{
                background: isActive ? "var(--sidebar-accent)" : "transparent",
                color: isActive ? "#FFFFFF" : "var(--sidebar-foreground)",
                borderLeft: isActive ? "3px solid var(--sidebar-primary)" : "3px solid transparent",
              }}
              title={collapsed ? label : undefined}
            >
              <Icon size={16} className="flex-shrink-0" style={{ color: isActive ? "var(--sidebar-primary)" : undefined }} />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs w-full opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: "var(--sidebar-foreground)" }}
        >
          <Settings size={14} />
          {!collapsed && "Paramètres"}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs w-full opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: "var(--sidebar-foreground)" }}
        >
          <LogOut size={14} />
          {!collapsed && "Déconnexion"}
        </button>
      </div>
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ title, onOpenSettings, onOpenContent, onLogout, profileMenuOpen, setProfileMenuOpen, sidebarOpen, setSidebarOpen }: { title: string; onOpenSettings: () => void; onOpenContent: () => void; onLogout: () => void; profileMenuOpen: boolean; setProfileMenuOpen: (value: boolean) => void; sidebarOpen: boolean; setSidebarOpen: (value: boolean) => void; }) {
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen, setProfileMenuOpen]);

  return (
    <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-4 sticky top-0 z-10 md:px-6">
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground transition hover:bg-secondary md:hidden"
        aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{title}</h1>
          <a href="/" target="_blank" rel="noopener" className="text-sm text-[var(--sgi-blue)] hover:underline">Visiter le site</a>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="bg-muted rounded-lg pl-9 pr-4 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-ring/40 w-52"
            placeholder="Rechercher..."
          />
        </div>
        <button type="button" className="relative w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-secondary transition-colors">
          <Bell size={14} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
        </button>
        <div ref={profileMenuRef} className="relative pl-2 border-l border-border">
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">SG</div>
            <span className="text-sm text-foreground hidden sm:block">Sec. Général</span>
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card p-2 shadow-lg z-20">
              <button type="button" onClick={() => { onOpenSettings(); setProfileMenuOpen(false); }} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">Profil & paramètres</button>
              {(() => {
                const role = window.localStorage.getItem("sgi-current-role");
                if (role === "admin" || role === "centre") {
                  return (
                    <button type="button" onClick={() => { onOpenContent(); setProfileMenuOpen(false); }} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-muted">Gérer le contenu</button>
                  );
                }
                return null;
              })()}
              <button type="button" onClick={() => { onLogout(); setProfileMenuOpen(false); }} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Déconnexion</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Dashboard Module ─────────────────────────────────────────────────────────

function Dashboard() {
  return (
    <div className="p-6 flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Membres actifs" value="742" sub="+ 23 ce mois-ci" icon={Users} trend={3.2} color="bg-primary" />
        <KpiCard label="Cotisations (Juil.)" value="4 120 000" sub="CDF collectés" icon={TrendingUp} trend={9.1} color="bg-accent" />
        <KpiCard label="Vague de Paix actifs" value="318" sub="Abonnements en cours" icon={Globe} trend={5.4} color="bg-[#2E7D52]" />
        <KpiCard label="Directives publiées" value="4" sub="Ce mois — 1 brouillon" icon={FileText} trend={undefined} color="bg-[#8B3A9E]" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Évolution des cotisations</div>
              <div className="text-xs text-muted-foreground">6 derniers mois (CDF)</div>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
              <Download size={12} /> Exporter
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cotisationsMensuelles} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [name === "montant" ? `${fmt(v)} CDF` : `${v} membres`, name === "montant" ? "Cotisations" : "Membres"]}
              />
              <Area yAxisId="left" type="monotone" dataKey="montant" fill="rgba(26,52,112,0.08)" stroke="#1A3470" strokeWidth={2} dot={{ fill: "#1A3470", r: 3 }} />
              <Bar yAxisId="right" dataKey="membres" fill="rgba(196,146,14,0.25)" radius={[3, 3, 0, 0]} barSize={16} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="text-sm font-semibold text-foreground mb-0.5" style={{ fontFamily: "var(--font-display)" }}>Répartition Dons Zaimu</div>
          <div className="text-xs text-muted-foreground mb-3">Par catégorie (Juil. 2024)</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={donsZaimu} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                {donsZaimu.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-2">
            {donsZaimu.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }} />
                  <span className="text-foreground">{d.name}</span>
                </div>
                <span className="font-medium text-muted-foreground">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent directives */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Dernières directives</div>
          <span className="text-xs text-[#1A3470] font-medium cursor-pointer hover:underline">Voir toutes →</span>
        </div>
        <div className="flex flex-col gap-0">
          {directives.slice(0, 3).map((d, i) => (
            <div key={d.id} className={`flex items-start gap-4 py-3 ${i < 2 ? "border-b border-border" : ""}`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EFF2F8" }}>
                <BookOpen size={13} className="text-[#1A3470]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{d.titre}</span>
                  <PrioriteBadge priorite={d.priorite} />
                  <StatutBadge statut={d.statut} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{d.audience} · {d.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Membres Module ───────────────────────────────────────────────────────────

function MembreDetail({ membre, onClose }: { membre: typeof membres[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
              {membre.prenom[0]}{membre.nom[0]}
            </div>
            <div>
              <div className="font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{membre.prenom} {membre.nom}</div>
              <div className="text-xs text-muted-foreground">{membre.chapitre}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4 text-sm">
          {[
            ["Date de naissance", membre.dateNaissance],
            ["Département", membre.departement],
            ["Catégorie", membre.categorie],
            ["Responsabilité", membre.responsabilite],
            ["Date de début de pratique", membre.dateDebutPratique],
            ["Vague de Paix (année en cours)", membre.abonnementVaguePaix ? <span className="text-emerald-600 font-medium">Oui</span> : <span className="text-muted-foreground">Non</span>],
            ["Quartier", membre.quartier],
            ["District", membre.district],
            ["Statut", <StatutBadge statut={membre.statut} />],
            ["Cotisation", <StatutBadge statut={membre.cotisation} />],
            ["Abonnement", membre.abonnement ? <span className="text-emerald-600 font-medium">Abonné</span> : <span className="text-muted-foreground">Non abonné</span>],
            ["Adhésion", membre.adhesion],
            ["Email", membre.email],
            ["Téléphone", membre.telephone],
          ].map(([label, val], i) => (
            <div key={i}>
              <div className="text-xs text-muted-foreground mb-1">{label as string}</div>
              <div className="text-foreground font-medium">{val as any}</div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 border-t border-border pt-4 grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Total cotisations</div>
            <div className="text-base font-bold text-foreground mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>{fmt(membre.totalCotisations)} CDF</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Total dons zaimu</div>
            <div className="text-base font-bold text-foreground mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>{fmt(membre.totalDons)} CDF</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Membres() {
  const [chapitreFilter, setChapitreFilter] = useState("Tous");
  const [districtFilter, setDistrictFilter] = useState("Tous");
  const [statutFilter, setStatutFilter] = useState("Tous");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof membres[0] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    dateNaissance: "",
    departement: "",
    categorie: "Homme",
    responsabilite: "Membre",
    dateDebutPratique: "",
    abonnementVaguePaix: true,
    quartier: "",
    chapitre: CHAPITRES[1],
    district: DISTRICTS[1],
    statut: "Actif",
    cotisation: "À jour",
    abonnement: true,
  });
  const [members, setMembers] = useState(membres);
  const [formError, setFormError] = useState("");

  const cotisationOptions = ["À jour", "En retard", "Non renseigné"];

  const filtered = useMemo(() => members.filter((m) => {
    if (chapitreFilter !== "Tous" && m.chapitre !== chapitreFilter) return false;
    if (districtFilter !== "Tous" && m.district !== districtFilter) return false;
    if (statutFilter !== "Tous" && m.statut !== statutFilter) return false;
    if (search && !`${m.prenom} ${m.nom}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [chapitreFilter, districtFilter, statutFilter, search, members]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formValues.prenom.trim() || !formValues.nom.trim() || !formValues.email.trim()) {
      setFormError("Le prénom, le nom et l’e-mail sont obligatoires.");
      return;
    }

    const newMember = createMemberFromForm(formValues, members as any);
    setMembers((prev) => [newMember, ...prev]);
    setShowForm(false);
    setFormValues({
      prenom: "",
      nom: "",
      email: "",
      telephone: "",
      dateNaissance: "",
      departement: "",
      categorie: "Homme",
      responsabilite: "Membre",
      dateDebutPratique: "",
      abonnementVaguePaix: true,
      quartier: "",
      chapitre: CHAPITRES[1],
      district: DISTRICTS[1],
      statut: "Actif",
      cotisation: "À jour",
      abonnement: true,
    });
    setFormError("");
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      {selected && <MembreDetail membre={selected} onClose={() => setSelected(null)} />}

      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-40">
          <label className="text-xs text-muted-foreground mb-1 block font-medium">Recherche</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-input-background border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-ring/30"
              placeholder="Nom du membre..." />
          </div>
        </div>
        {[
          ["Chapitre", CHAPITRES, chapitreFilter, setChapitreFilter],
          ["District", DISTRICTS, districtFilter, setDistrictFilter],
          ["Statut", STATUTS, statutFilter, setStatutFilter],
        ].map(([label, opts, val, set]: any) => (
          <div key={label} className="min-w-36">
            <label className="text-xs text-muted-foreground mb-1 block font-medium">{label}</label>
            <select value={val} onChange={(e) => set(e.target.value)}
              className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 ring-ring/30">
              {opts.map((o: string) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button onClick={() => setShowForm((prev) => !prev)} className="ml-auto flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
          <Plus size={14} /> {showForm ? "Fermer" : "Nouveau membre"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-4 grid gap-4 md:grid-cols-2">
          {formError && <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Prénom</label>
            <input required value={formValues.prenom} onChange={(e) => setFormValues((prev) => ({ ...prev, prenom: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nom</label>
            <input required value={formValues.nom} onChange={(e) => setFormValues((prev) => ({ ...prev, nom: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input type="email" required value={formValues.email} onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Téléphone</label>
            <input value={formValues.telephone} onChange={(e) => setFormValues((prev) => ({ ...prev, telephone: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date de naissance</label>
            <input type="date" value={formValues.dateNaissance} onChange={(e) => setFormValues((prev) => ({ ...prev, dateNaissance: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Département</label>
            <input value={formValues.departement} onChange={(e) => setFormValues((prev) => ({ ...prev, departement: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Catégorie</label>
            <select value={formValues.categorie} onChange={(e) => setFormValues((prev) => ({ ...prev, categorie: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm">
              {['Homme', 'Femme', 'Jeune homme', 'Jeune fille', 'Avenir'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Responsabilité</label>
            <select value={formValues.responsabilite} onChange={(e) => setFormValues((prev) => ({ ...prev, responsabilite: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm">
              {['Membre', 'Responsable centre', 'Responsable chapitre', 'Responsable district', 'Responsable groupe'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date de début de pratique</label>
            <input type="date" value={formValues.dateDebutPratique} onChange={(e) => setFormValues((prev) => ({ ...prev, dateDebutPratique: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Quartier / lieu de résidence</label>
            <input value={formValues.quartier} onChange={(e) => setFormValues((prev) => ({ ...prev, quartier: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Chapitre</label>
            <select value={formValues.chapitre} onChange={(e) => setFormValues((prev) => ({ ...prev, chapitre: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm">
              {CHAPITRES.filter((c) => c !== "Tous").map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">District</label>
            <select value={formValues.district} onChange={(e) => setFormValues((prev) => ({ ...prev, district: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm">
              {DISTRICTS.filter((d) => d !== "Tous").map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
            <select value={formValues.statut} onChange={(e) => setFormValues((prev) => ({ ...prev, statut: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm">
              {STATUTS.filter((s) => s !== "Tous").map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Cotisation</label>
            <select value={formValues.cotisation} onChange={(e) => setFormValues((prev) => ({ ...prev, cotisation: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm">
              {cotisationOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={formValues.abonnementVaguePaix} onChange={(e) => setFormValues((prev) => ({ ...prev, abonnementVaguePaix: e.target.checked }))} />
              Abonnement Vague de Paix de l’année en cours
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={formValues.abonnement} onChange={(e) => setFormValues((prev) => ({ ...prev, abonnement: e.target.checked }))} />
              Abonné au service / newsletter
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm">Annuler</button>
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Enregistrer</button>
          </div>
        </form>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{filtered.length} membre{filtered.length !== 1 ? "s" : ""}</span>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Download size={12} /> Exporter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Membre", "Chapitre", "District", "Statut", "Cotisation", "Vague de Paix", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center flex-shrink-0">
                        {m.prenom[0]}{m.nom[0]}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{m.prenom} {m.nom}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.chapitre.split("–")[1]?.trim()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.district}</td>
                  <td className="px-4 py-3"><StatutBadge statut={m.statut} /></td>
                  <td className="px-4 py-3"><StatutBadge statut={m.cotisation} /></td>
                  <td className="px-4 py-3">
                    {m.abonnement
                      ? <CheckCircle size={14} className="text-emerald-500" />
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(m)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Voir détail"><Eye size={13} className="text-muted-foreground" /></button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Modifier"><Edit2 size={13} className="text-muted-foreground" /></button>
                      <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Désactiver"><UserX size={13} className="text-muted-foreground" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Finances Module ──────────────────────────────────────────────────────────

function Finances() {
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("Cotisation");
  const [formMembre, setFormMembre] = useState("");
  const [formMontant, setFormMontant] = useState("");

  const types = ["Tous", "Cotisation", "Don Zaimu", "Abonnement"];
  const filtered = transactions.filter((t) => typeFilter === "Tous" || t.type === typeFilter);

  const totaux = useMemo(() => ({
    cotisations: transactions.filter(t => t.type === "Cotisation" && t.statut === "Validé").reduce((a, t) => a + t.montant, 0),
    dons: transactions.filter(t => t.type === "Don Zaimu" && t.statut === "Validé").reduce((a, t) => a + t.montant, 0),
    abonnements: transactions.filter(t => t.type === "Abonnement" && t.statut === "Validé").reduce((a, t) => a + t.montant, 0),
  }), []);

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Cotisations validées", value: totaux.cotisations, color: "text-[#1A3470]", bg: "bg-[#1A3470]/8" },
          { label: "Dons Zaimu validés", value: totaux.dons, color: "text-[#C4920E]", bg: "bg-[#C4920E]/8" },
          { label: "Abonnements validés", value: totaux.abonnements, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`bg-card rounded-xl border border-border p-4 flex items-center gap-3`}>
            <div className={`${bg} ${color} rounded-lg p-2.5`}>
              <Wallet size={16} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className={`text-lg font-bold ${color}`} style={{ fontFamily: "var(--font-mono)" }}>{fmt(value)}</div>
              <div className="text-xs text-muted-foreground">CDF</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick entry */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
          onClick={() => setShowForm(!showForm)}
        >
          <div className="flex items-center gap-2">
            <Plus size={15} className="text-[#1A3470]" />
            Saisie rapide d'une transaction
          </div>
          {showForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showForm && (
          <div className="border-t border-border px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 ring-ring/30">
                {["Cotisation", "Don Zaimu", "Abonnement"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Membre</label>
              <select value={formMembre} onChange={(e) => setFormMembre(e.target.value)}
                className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 ring-ring/30">
                <option value="">Sélectionner...</option>
                {membres.map((m) => <option key={m.id}>{m.prenom} {m.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Montant (CDF)</label>
              <input value={formMontant} onChange={(e) => setFormMontant(e.target.value)}
                type="number" placeholder="60 000"
                className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-ring/30" />
            </div>
            <div className="flex items-end">
              <button className="w-full bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <Send size={13} /> Enregistrer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transactions table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Transactions récentes</span>
          <div className="flex gap-1.5 ml-auto">
            {types.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Référence", "Date", "Membre", "Type", "Montant", "Statut"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.id}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.date}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{t.membre}</td>
                  <td className="px-4 py-3"><TypeBadge type={t.type} /></td>
                  <td className="px-4 py-3 font-medium text-foreground" style={{ fontFamily: "var(--font-mono)" }}>{fmt(t.montant)}</td>
                  <td className="px-4 py-3"><StatutBadge statut={t.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report by district */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Rapport par chapitre</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Chapitre", "Membres", "Cotisations (CDF)", "Dons Zaimu (CDF)", "Total"].map((h) => (
                  <th key={h} className="text-left pb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {membresByChap.map((c, i) => (
                <tr key={i} className={`border-b border-border ${i === membresByChap.length - 1 ? "border-b-0" : ""}`}>
                  <td className="py-3 font-medium text-foreground pr-6">{c.chapitre.replace("\n", " ")}</td>
                  <td className="py-3 text-muted-foreground pr-6" style={{ fontFamily: "var(--font-mono)" }}>{c.membres}</td>
                  <td className="py-3 text-foreground pr-6" style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.cotisations)}</td>
                  <td className="py-3 text-foreground pr-6" style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.dons)}</td>
                  <td className="py-3 font-bold text-[#1A3470]" style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.cotisations + c.dons)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Directives Module ────────────────────────────────────────────────────────

function Directives() {
  const [showEditor, setShowEditor] = useState(false);
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [audience, setAudience] = useState("Tous les chapitres");
  const [priorite, setPriorite] = useState("Normale");
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Editor */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/30 transition-colors"
          onClick={() => setShowEditor(!showEditor)}
        >
          <div className="flex items-center gap-2">
            <Plus size={15} className="text-[#1A3470]" />
            Créer une nouvelle directive
          </div>
          {showEditor ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showEditor && (
          <div className="border-t border-border p-5 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block font-medium">Titre de la directive</label>
                <input value={titre} onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex : Convocation — Assemblée du 15 août"
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-ring/30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block font-medium">Priorité</label>
                <select value={priorite} onChange={(e) => setPriorite(e.target.value)}
                  className="w-full bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 ring-ring/30">
                  {["Haute", "Normale", "Basse"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Audience cible</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value)}
                className="w-full md:w-72 bg-input-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 ring-ring/30">
                {["Tous les chapitres", ...CHAPITRES.slice(1), "District Nord", "District Sud", "District Est", "District Ouest"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-medium">Contenu</label>
              <textarea value={contenu} onChange={(e) => setContenu(e.target.value)}
                rows={6} placeholder="Rédigez ici le contenu de la directive..."
                className="w-full bg-input-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 ring-ring/30 resize-y" />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                <Send size={13} /> Publier
              </button>
              <button className="flex items-center gap-2 bg-muted text-muted-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-secondary transition-colors">
                Sauvegarder brouillon
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex flex-col gap-0">
        {directives.map((d, i) => (
          <div key={d.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full mt-4 flex-shrink-0 border-2 ${d.statut === "Publié" ? "bg-[#1A3470] border-[#1A3470]" : "bg-white border-gray-300"}`} />
              {i < directives.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            {/* Card */}
            <div className={`flex-1 mb-3 bg-card rounded-xl border border-border overflow-hidden ${d.statut === "Brouillon" ? "opacity-70" : ""}`}>
              <button
                className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              >
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="font-medium text-foreground text-sm flex-1" style={{ fontFamily: "var(--font-display)" }}>{d.titre}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    <PrioriteBadge priorite={d.priorite} />
                    <StatutBadge statut={d.statut} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar size={10} /> {d.date}</span>
                  <span className="flex items-center gap-1"><Target size={10} /> {d.audience}</span>
                  <span className="flex items-center gap-1"><BookOpen size={10} /> {d.auteur}</span>
                </div>
              </button>
              {expanded === d.id && (
                <div className="px-4 pb-4 border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.contenu}</p>
                  <div className="flex gap-2 mt-3">
                    <button className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
                      <Edit2 size={11} /> Modifier
                    </button>
                    <button className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors">
                      <Download size={11} /> Exporter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Statistiques Module ──────────────────────────────────────────────────────

function Statistiques() {
  const [axe, setAxe] = useState<"membres" | "cotisations" | "dons">("membres");
  const [fromDate, setFromDate] = useState(() => format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const axeLabel: Record<string, string> = { membres: "Membres", cotisations: "Cotisations (CDF)", dons: "Dons Zaimu (CDF)" };

  const filteredTransactions = transactions.filter((t) => {
    const date = parseISO(t.date);
    const from = parseISO(fromDate);
    const to = parseISO(toDate);
    return date >= from && date <= to;
  });

  const totalCotisations = filteredTransactions
    .filter((t) => t.type === "Cotisation")
    .reduce((sum, t) => sum + t.montant, 0);
  const totalDons = filteredTransactions
    .filter((t) => t.type === "Don Zaimu")
    .reduce((sum, t) => sum + t.montant, 0);
  const totalTransactions = filteredTransactions.length;
  const uniqueMembers = new Set(filteredTransactions.map((t) => t.membre)).size;

  const trendData = cotisationsMensuelles.map((m) => ({
    ...m,
    donsMontant: Math.round(m.montant * 0.22),
    abonnements: Math.round(m.membres * 0.43),
  }));
  const totalAbonnements = trendData.reduce((sum, m) => sum + m.abonnements, 0);

  const barData = membresByChap.map((c) => ({
    name: c.chapitre.replace("\n", " "),
    Membres: c.membres,
    Cotisations: c.cotisations,
    Dons: c.dons,
  }));

  const exportStatsPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const title = "Rapport de statistiques du Centre";
    doc.setFontSize(18);
    doc.text(title, 40, 50);

    doc.setFontSize(12);
    doc.text(`Période : ${format(parseISO(fromDate), "dd MMM yyyy")} – ${format(parseISO(toDate), "dd MMM yyyy")}`, 40, 80);
    doc.text(`Total de transactions : ${totalTransactions}`, 40, 100);
    doc.text(`Membres actifs dans la période : ${uniqueMembers}`, 40, 120);
    doc.text(`Total cotisations : ${fmt(totalCotisations)} CDF`, 40, 140);
    doc.text(`Total dons : ${fmt(totalDons)} CDF`, 40, 160);
    doc.text(`Abonnements estimés (6 mois) : ${fmt(totalAbonnements)} membres`, 40, 180);

    doc.setFontSize(14);
    doc.text("Synthèse par chapitre", 40, 220);
    let y = 240;
    doc.setFontSize(11);
    doc.text("Chapitre", 40, y);
    doc.text("Membres", 220, y);
    doc.text("Cotisations", 350, y);
    doc.text("Dons", 470, y);
    y += 16;

    membresByChap.forEach((c) => {
      doc.text(c.chapitre.replace("\n", " "), 40, y);
      doc.text(`${c.membres}`, 220, y);
      doc.text(`${fmt(c.cotisations)} CDF`, 350, y);
      doc.text(`${fmt(c.dons)} CDF`, 470, y);
      y += 16;
      if (y > 760) {
        doc.addPage();
        y = 50;
      }
    });

    const filename = `statistiques_centre_${fromDate}_${toDate}.pdf`;
    doc.save(filename);
  };

  const exportStatsExcel = () => {
    const summaryData = [
      { Clé: "Période", Valeur: `${format(parseISO(fromDate), "dd MMM yyyy")} – ${format(parseISO(toDate), "dd MMM yyyy")}` },
      { Clé: "Total de transactions", Valeur: totalTransactions },
      { Clé: "Membres actifs", Valeur: uniqueMembers },
      { Clé: "Total cotisations (CDF)", Valeur: totalCotisations },
      { Clé: "Total dons (CDF)", Valeur: totalDons },
      { Clé: "Abonnements estimés", Valeur: totalAbonnements },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const chaptersSheet = XLSX.utils.json_to_sheet(
      membresByChap.map((c) => ({
        Chapitre: c.chapitre.replace("\n", " "),
        Membres: c.membres,
        Cotisations: c.cotisations,
        Dons: c.dons,
      }))
    );
    const transactionsSheet = XLSX.utils.json_to_sheet(
      filteredTransactions.map((t) => ({
        Date: t.date,
        Membre: t.membre,
        Type: t.type,
        Montant: t.montant,
        Chapitre: t.chapitre,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Résumé");
    XLSX.utils.book_append_sheet(workbook, chaptersSheet, "Par chapitre");
    XLSX.utils.book_append_sheet(workbook, transactionsSheet, "Transactions");

    const filename = `statistiques_centre_${fromDate}_${toDate}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Exporter les statistiques</div>
          <div className="text-xs text-muted-foreground">Générez un PDF ou un fichier Excel pour la période choisie.</div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Du :</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm outline-none" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">Au :</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm outline-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={exportStatsPdf} className="inline-flex items-center gap-2 rounded-full bg-[var(--sgi-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d3660]">
              <Download size={14} /> Exporter PDF
            </button>
            <button onClick={exportStatsExcel} className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted">
              <Download size={14} /> Exporter Excel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Analyse croisée par chapitre</div>
            <div className="text-xs text-muted-foreground">Comparaison multi-indicateurs</div>
          </div>
          <div className="flex gap-1.5">
            {(["membres", "cotisations", "dons"] as const).map((k) => (
              <button key={k} onClick={() => setAxe(k)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors capitalize ${axe === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                {axeLabel[k]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false}
              tickFormatter={axe === "membres" ? undefined : (v) => `${(v / 1000000).toFixed(1)}M`} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [axe === "membres" ? v : `${fmt(v)} CDF`]} />
            <Bar dataKey={axe === "membres" ? "Membres" : axe === "cotisations" ? "Cotisations" : "Dons"}
              fill="#1A3470" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trend area charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="text-sm font-semibold text-foreground mb-0.5" style={{ fontFamily: "var(--font-display)" }}>Cotisations vs Dons Zaimu</div>
          <div className="text-xs text-muted-foreground mb-4">Évolution sur 6 mois (CDF)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A3470" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1A3470" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4920E" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#C4920E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => [`${fmt(v)} CDF`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="montant" name="Cotisations" stroke="#1A3470" fill="url(#gradBlue)" strokeWidth={2} dot={{ r: 2.5, fill: "#1A3470" }} />
              <Area type="monotone" dataKey="donsMontant" name="Dons Zaimu" stroke="#C4920E" fill="url(#gradGold)" strokeWidth={2} dot={{ r: 2.5, fill: "#C4920E" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="text-sm font-semibold text-foreground mb-0.5" style={{ fontFamily: "var(--font-display)" }}>Membres vs Abonnements Vague de Paix</div>
          <div className="text-xs text-muted-foreground mb-4">Évolution sur 6 mois</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="membres" name="Membres actifs" stroke="#1A3470" strokeWidth={2} dot={{ r: 3, fill: "#1A3470" }} />
              <Line type="monotone" dataKey="abonnements" name="Abonnements VP" stroke="#2E7D52" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3, fill: "#2E7D52" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Tableau de synthèse par chapitre</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Chapitre", "Membres", "Cotisations (CDF)", "Dons (CDF)", "Abonnements VP", "Ratio VP"].map((h) => (
                  <th key={h} className="text-left pb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {membresByChap.map((c, i) => {
                const vp = Math.round(c.membres * 0.43);
                const ratio = Math.round((vp / c.membres) * 100);
                return (
                  <tr key={i} className={`border-b border-border hover:bg-muted/20 transition-colors ${i === membresByChap.length - 1 ? "border-b-0" : ""}`}>
                    <td className="py-3 font-medium text-foreground pr-4">{c.chapitre.replace("\n", " ")}</td>
                    <td className="py-3 text-foreground pr-4" style={{ fontFamily: "var(--font-mono)" }}>{c.membres}</td>
                    <td className="py-3 text-foreground pr-4" style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.cotisations)}</td>
                    <td className="py-3 text-foreground pr-4" style={{ fontFamily: "var(--font-mono)" }}>{fmt(c.dons)}</td>
                    <td className="py-3 text-foreground pr-4" style={{ fontFamily: "var(--font-mono)" }}>{vp}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5 min-w-16">
                          <div className="bg-[#2E7D52] h-1.5 rounded-full" style={{ width: `${ratio}%` }} />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground" style={{ fontFamily: "var(--font-mono)" }}>{ratio}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Module ───────────────────────────────────────────────────────

type SettingsTab = "profile" | "users" | "rbac" | "general";

function SettingsModule({ currentUserRole }: { currentUserRole: PlatformRole }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [selectedRole, setSelectedRole] = useState<PlatformRole>("admin");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(INITIAL_PROFILES[0]);
  const [rbacMatrix, setRbacMatrix] = useState(RBAC_MATRIX);
  const [appSettings, setAppSettings] = useState({ darkMode: false, emailAlerts: true, autoUpdates: false });
  const [currentUserEdits, setCurrentUserEdits] = useState<Profile | null>(null);

  const currentUserProfile = useMemo(() => profiles.find((profile) => profile.role === currentUserRole) ?? profiles[0], [profiles, currentUserRole]);

  useEffect(() => {
    setCurrentUserEdits(currentUserProfile);
  }, [currentUserProfile]);

  const updateProfile = (id: number, patch: Partial<Profile>) => {
    setProfiles((current) => current.map((profile) => profile.id === id ? { ...profile, ...patch } : profile));
    setSelectedProfile((current) => current && current.id === id ? { ...current, ...patch } : current);
    if (currentUserProfile?.id === id) {
      setCurrentUserEdits((current) => current ? { ...current, ...patch } : current);
    }
  };

  const visibleProfiles = useMemo(() => {
    if (!selectedRole) return profiles;
    return profiles.filter((profile) => profile.role === selectedRole);
  }, [profiles, selectedRole]);

  const addNewProfile = () => {
    const nextId = Math.max(...profiles.map((profile) => profile.id)) + 1;
    const newProfile: Profile = {
      id: nextId,
      name: "Nouvel utilisateur",
      email: "nouveau.utilisateur@sgi.org",
      role: "groupe",
      status: "En attente",
      chapitre: "Chapitre 1 – Kinshasa",
      department: "Administration",
    };
    setProfiles((current) => [...current, newProfile]);
    setSelectedProfile(newProfile);
    setSelectedRole("groupe");
  };

  const toggleRbacPermission = (module: string, role: PlatformRole) => {
    setRbacMatrix((current) => current.map((row) => row.module === module ? {
      ...row,
      roles: { ...row.roles, [role]: !row.roles[role] },
    } : row));
  };

  const saveCurrentUser = () => {
    if (!currentUserEdits) return;
    updateProfile(currentUserEdits.id, {
      name: currentUserEdits.name,
      email: currentUserEdits.email,
      chapitre: currentUserEdits.chapitre,
      department: currentUserEdits.department,
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex flex-col gap-4">
              <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Mon profil</div>
              {currentUserEdits ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Nom complet</label>
                      <input
                        value={currentUserEdits.name}
                        onChange={(e) => setCurrentUserEdits({ ...currentUserEdits, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <input
                        value={currentUserEdits.email}
                        onChange={(e) => setCurrentUserEdits({ ...currentUserEdits, email: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Chapitre</label>
                      <input
                        value={currentUserEdits.chapitre}
                        onChange={(e) => setCurrentUserEdits({ ...currentUserEdits, chapitre: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Département</label>
                      <input
                        value={currentUserEdits.department}
                        onChange={(e) => setCurrentUserEdits({ ...currentUserEdits, department: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-5">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Informations</div>
                    <div className="mt-3 space-y-2 text-sm text-foreground">
                      <div><span className="font-medium">Rôle :</span> {ROLE_LABELS[currentUserEdits.role]}</div>
                      <div><span className="font-medium">Statut :</span> {currentUserEdits.status}</div>
                    </div>
                    <button
                      onClick={saveCurrentUser}
                      className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Aucun profil utilisateur actif trouvé.</div>
              )}
            </div>
          </div>
        );
      case "users":
        return (
          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Gestion des utilisateurs</div>
                  <div className="text-xs text-muted-foreground">Ajouter, modifier et gérer les profils</div>
                </div>
                <button
                  onClick={addNewProfile}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Ajouter un utilisateur
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profil</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rôle</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statut</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProfiles.map((profile) => (
                      <tr key={profile.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                              {profile.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{profile.name}</div>
                              <div className="text-xs text-muted-foreground">{profile.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={profile.role}
                            onChange={(e) => updateProfile(profile.id, { role: e.target.value as PlatformRole })}
                            className="rounded-lg border border-border bg-input-background px-2 py-1.5 text-xs outline-none"
                          >
                            {ALLOWED_ROLES.map((role) => (
                              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={profile.status}
                            onChange={(e) => updateProfile(profile.id, { status: e.target.value as ProfileStatus })}
                            className="rounded-lg border border-border bg-input-background px-2 py-1.5 text-xs outline-none"
                          >
                            {(["Actif", "En attente", "Suspendu"] as ProfileStatus[]).map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedProfile(profile)}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Voir
                          </button>
                          <button
                            onClick={() => setProfiles((current) => current.filter((item) => item.id !== profile.id))}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Informations sélection</div>
              {selectedProfile ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Nom</div>
                    <div className="font-medium text-foreground">{selectedProfile.name}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
                    <div className="font-medium text-foreground">{selectedProfile.email}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Rôle</div>
                    <div className="font-medium text-foreground">{ROLE_LABELS[selectedProfile.role]}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sélectionnez un utilisateur pour afficher ses détails.</div>
              )}
            </div>
          </div>
        );
      case "rbac":
        return (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Configuration RBAC</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module</th>
                    {ALLOWED_ROLES.map((role) => (
                      <th key={role} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{ROLE_LABELS[role]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rbacMatrix.map((row) => (
                    <tr key={row.module} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-medium text-foreground">{row.module}</td>
                      {ALLOWED_ROLES.map((role) => (
                        <td key={`${row.module}-${role}`} className="px-3 py-2.5">
                          <button
                            onClick={() => toggleRbacPermission(row.module, role)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${row.roles[role] ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                          >
                            {row.roles[role] ? "Oui" : "Non"}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "general":
        return (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="text-sm font-semibold text-foreground mb-4" style={{ fontFamily: "var(--font-display)" }}>Paramètres généraux</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: "Mode sombre", key: "darkMode" },
                { label: "Notifications par email", key: "emailAlerts" },
                { label: "Mises à jour automatiques", key: "autoUpdates" },
              ].map((setting) => (
                <label key={setting.key} className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-4">
                  <div>
                    <div className="text-sm font-medium text-foreground">{setting.label}</div>
                    <div className="text-xs text-muted-foreground">Activez ou désactivez cette option</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={appSettings[setting.key as keyof typeof appSettings]}
                    onChange={(e) => setAppSettings((current) => ({ ...current, [setting.key]: e.target.checked }))}
                    className="h-5 w-5 rounded border border-border bg-input-background text-primary"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Paramètres</div>
            <div className="text-xs text-muted-foreground">Séparez Profil, Utilisateurs, RBAC et options générales.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "profile", label: "Profil" },
              { key: "users", label: "Utilisateurs" },
              { key: "rbac", label: "RBAC" },
              { key: "general", label: "Paramètres" },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-3 py-2 text-xs font-medium transition ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "border border-border bg-transparent text-muted-foreground hover:bg-muted/70"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {renderTabContent()}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

const MODULE_TITLES: Record<string, string> = {
  dashboard: "Tableau de bord — Vue générale",
  contenu: "Gestion du contenu — Landing page",
  membres: "Gestion des membres",
  finances: "Module Finances",
  directives: "Directives & Communications",
  statistiques: "Statistiques & Analyses",
  settings: "Paramètres & RBAC",
};

export default function App() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<PlatformRole>("admin");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("sgi-current-role");
    if (saved && ALLOWED_ROLES.includes(saved as PlatformRole)) {
      setCurrentUserRole(saved as PlatformRole);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    window.localStorage.setItem("sgi-current-role", currentUserRole);
  }, [currentUserRole]);

  const allowedModules = useMemo(() => MODULE_ACCESS[currentUserRole], [currentUserRole]);

  const switchModule = (module: ModuleKey) => {
    if (allowedModules.includes(module)) {
      setActiveModule(module);
    }
  };

  const handleOpenSettings = () => {
    switchModule("settings");
    setProfileMenuOpen(false);
    setSidebarOpen(false);
  };

  const handleOpenContent = () => {
    switchModule("contenu");
    setProfileMenuOpen(false);
    setSidebarOpen(false);
  };

  const handleNavigate = (module: ModuleKey) => {
    switchModule(module);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("sgi-current-role");
    setProfileMenuOpen(false);
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "var(--font-sans)" }}>
      <Sidebar active={activeModule} setActive={switchModule} collapsed={collapsed} setCollapsed={setCollapsed} allowedModules={allowedModules} onOpenSettings={handleOpenSettings} onLogout={handleLogout} />
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}>
          <aside className="absolute left-0 top-0 h-full w-72 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--sidebar-border)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#d9a11a] via-[#a33b2d] to-[#0f3d6e]">
                    <SgiEmblem className="h-10 w-10 object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>SGI Côte d’Ivoire</div>
                    <div className="text-xs text-[var(--sidebar-foreground)]">Centre Miroir Parfait</div>
                  </div>
                </div>
                <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-full p-2 text-[var(--sidebar-foreground)] hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-2 py-4">
                {NAV.filter(({ key }) => allowedModules.includes(key as ModuleKey)).map(({ key, label, icon: Icon }) => {
                  const isActive = activeModule === key;
                  return (
                    <button
                      key={key}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleNavigate(key as ModuleKey);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-left transition ${isActive ? "bg-[rgba(255,255,255,0.08)] text-white" : "text-[var(--sidebar-foreground)] hover:bg-white/10"}`}
                    >
                      <Icon size={16} className="flex-shrink-0" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="px-2 py-3 border-t border-[var(--sidebar-border)]">
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); handleOpenSettings(); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-left text-[var(--sidebar-foreground)] hover:bg-white/10"
                >
                  <Settings size={14} />
                  Paramètres
                </button>
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); handleLogout(); }}
                  className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-left text-[var(--sidebar-foreground)] hover:bg-white/10"
                >
                  <LogOut size={14} />
                  Déconnexion
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={MODULE_TITLES[activeModule]} onOpenSettings={handleOpenSettings} onOpenContent={handleOpenContent} onLogout={handleLogout} profileMenuOpen={profileMenuOpen} setProfileMenuOpen={setProfileMenuOpen} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto" style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,0,0,0.1) transparent",
        }}>
          {activeModule === "dashboard" && <Dashboard />}
          {activeModule === "contenu" && (currentUserRole === "admin" ? <div className="p-6"><h2 className="text-lg font-semibold mb-4">Édition du contenu (Admin)</h2><AdminEditLanding /></div> : <div className="p-6"><h2 className="text-lg font-semibold mb-4">Édition du contenu (Centre)</h2><CentreEditLanding /></div>)}
          {activeModule === "membres" && <Membres />}
          {activeModule === "finances" && <Finances />}
          {activeModule === "directives" && <Directives />}
          {activeModule === "statistiques" && <Statistiques />}
          {activeModule === "settings" && <SettingsModule currentUserRole={currentUserRole} />}
        </main>
      </div>
    </div>
  );
}
