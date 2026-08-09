import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
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
  ChevronLeft, SquarePen, Moon, Sun, HeartHandshake, Camera, FileUp, UserRound,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from "recharts";
import sgiLogo from "../../image/logo-sgi.jpg";
import { createMemberFromForm, readImageAsDataUrl } from "./memberFormUtils";
import { DashboardAiAssistant } from "../components/ai/DashboardAiAssistant";
import { DeveloperCredit } from "../components/DeveloperCredit";
import { MEMBERS_SEED } from "./membersData";
import { MemberAvatar } from "./MemberAvatar";
import AdminEditLanding from "../pages/AdminEditLanding";
import CollectesModule, { COLLECTES_SEED } from "./CollectesModule";
import RoleDashboard from "./RoleDashboard";
import MembersKpiPanel from "./MembersKpiPanel";
import MembersImportExportBar from "./MembersImportExportBar";
import ZaimuQuotaPanel from "./ZaimuQuotaPanel";
import ProfilePage from "./ProfilePage";
import { DEMO_ORG_SCOPE, filterMembersByScope } from "./memberListStats";
import {
  formatCdf,
  getMemberSpecialAssignment,
  getMemberZaimuPaid,
  ZAIMU_SPECIAL_CAMPAIGN,
} from "./zaimuQuota";
import { RowActionsMenu } from "./RowActionsMenu";
import { ALLOWED_ROLES, MODULE_ACCESS, ROLE_LABELS, type ModuleKey, type PlatformRole } from "./roles";
import { INITIAL_PROFILES, type ProfileStatus, type UserProfile as Profile } from "./profilesData";

// ─── Data ────────────────────────────────────────────────────────────────────

const CHAPITRES = ["Tous", "Chapitre 1 – Kinshasa", "Chapitre 2 – Brazzaville", "Chapitre 3 – Paris", "Chapitre 4 – Abidjan"];
const DISTRICTS = ["Tous", "District Nord", "District Sud", "District Est", "District Ouest"];
const STATUTS = ["Tous", "Actif", "En attente", "Suspendu"];
const RESPONSABILITES = [
  "Membre simple",
  "Responsable groupe",
  "Responsable district",
  "Responsable chapitre",
  "Responsable centre",
] as const;
const RESPONSABILITE_FILTERS = ["Tous", ...RESPONSABILITES] as const;

const membres = MEMBERS_SEED;

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

const RBAC_MATRIX = [
  { module: "Tableau de bord", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: true } },
  { module: "Membres", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: true } },
  { module: "Finances", roles: { admin: true, centre: true, chapitre: false, district: false, groupe: false } },
  { module: "Collectes", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: true } },
  { module: "Statistiques", roles: { admin: true, centre: true, chapitre: true, district: true, groupe: false } },
  { module: "Contenu", roles: { admin: true, centre: true, chapitre: false, district: false, groupe: false } },
  { module: "Paramètres", roles: { admin: true, centre: true, chapitre: false, district: false, groupe: false } },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** ASCII-safe (évite \u202f fr-FR mal rendu en PDF comme "/"). */
const fmt = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  return `${sign}${String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
};

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
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, group: "principal" },
  { key: "statistiques", label: "Statistiques", icon: BarChart3, group: "principal" },
  { key: "membres", label: "Membres", icon: Users, group: "gestion" },
  { key: "collectes", label: "Collectes", icon: HeartHandshake, group: "gestion" },
  { key: "finances", label: "Finances", icon: Wallet, group: "gestion" },
  { key: "contenu", label: "Contenu", icon: SquarePen, group: "gestion" },
  { key: "profil", label: "Mon profil", icon: UserRound, group: "compte" },
  { key: "settings", label: "Paramètres", icon: Settings, group: "compte" },
] as const;

const ROLE_SPACE: Record<PlatformRole, { title: string; subtitle: string }> = {
  admin: { title: "Espace Admin", subtitle: "Pilotage global du centre" },
  centre: { title: "Espace Centre", subtitle: "Pilotage de l’application" },
  chapitre: { title: "Espace Chapitre", subtitle: "Animation du chapitre" },
  district: { title: "Espace District", subtitle: "Suivi des groupes" },
  groupe: { title: "Espace Groupe", subtitle: "Accompagnement des membres" },
};

function SidebarNavItems({
  active,
  onNavigate,
  allowedModules,
  collapsed = false,
}: {
  active: string;
  onNavigate: (key: ModuleKey) => void;
  allowedModules: ModuleKey[];
  collapsed?: boolean;
}) {
  const visibleNav = NAV.filter(({ key }) => allowedModules.includes(key as ModuleKey));
  const groups = [
    { id: "principal", label: "Vue" },
    { id: "gestion", label: "Travail" },
    { id: "compte", label: "Compte" },
  ] as const;

  return (
    <nav className="sgi-sidebar-scroll flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((group) => {
        const items = visibleNav.filter((item) => item.group === group.id);
        if (items.length === 0) return null;
        return (
          <div key={group.id}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map(({ key, label, icon: Icon }) => {
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onNavigate(key as ModuleKey)}
                    title={collapsed ? label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[13.5px] font-medium transition-all duration-200 ease-out ${
                      collapsed ? "justify-center px-0" : ""
                    } ${
                      isActive
                        ? "bg-[var(--sgi-blue)] text-white shadow-[0_8px_20px_rgba(10,47,82,0.22)]"
                        : "text-foreground/70 hover:bg-[var(--sgi-gold)]/10 hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                        isActive
                          ? "bg-[var(--sgi-gold)] text-[var(--sgi-blue-deep)]"
                          : "bg-transparent text-foreground/50 group-hover:text-[var(--sgi-blue)]"
                      }`}
                    >
                      <Icon size={17} strokeWidth={isActive ? 2.25 : 1.9} />
                    </span>
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {isActive && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sgi-red)]" aria-hidden />
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function SidebarShell({
  active,
  onNavigate,
  allowedModules,
  role,
  onLogout,
  collapsed = false,
  setCollapsed,
  onClose,
  showCollapse = false,
}: {
  active: string;
  onNavigate: (key: ModuleKey) => void;
  allowedModules: ModuleKey[];
  role: PlatformRole;
  onLogout: () => void;
  collapsed?: boolean;
  setCollapsed?: (value: boolean) => void;
  onClose?: () => void;
  showCollapse?: boolean;
}) {
  const space = ROLE_SPACE[role];
  const initials = ROLE_LABELS[role]
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div className="sgi-tricolor h-1.5 w-full shrink-0" aria-hidden />

      <div className={`relative z-[1] flex items-center gap-3 border-b border-border px-3 py-4 ${collapsed ? "flex-col" : ""}`}>
        <div className={`flex min-w-0 flex-1 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-2 ring-[var(--sgi-gold)]/50">
            <SgiEmblem className="h-10 w-10 object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-semibold leading-tight text-foreground">
                Miroir Parfait
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--sgi-blue)]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--sgi-gold)]" />
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--sgi-red)]" />
                <span className="text-[11px] text-muted-foreground">SGI Côte d’Ivoire</span>
              </div>
            </div>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        )}

        {showCollapse && setCollapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition hover:border-[var(--sgi-gold)]/40 hover:text-[var(--sgi-blue)]"
            aria-label={collapsed ? "Déployer la barre latérale" : "Réduire la barre latérale"}
            title={collapsed ? "Déployer" : "Réduire"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {!collapsed ? (
        <div className="relative z-[1] px-3 pt-4">
          <div className="overflow-hidden rounded-2xl bg-secondary/70 ring-1 ring-border">
            <div className="sgi-tricolor h-1 w-full" aria-hidden />
            <div className="flex items-center gap-3 px-3 py-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--sgi-blue)] font-display text-xs font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{ROLE_LABELS[role]}</p>
                <p className="truncate text-[11px] text-muted-foreground">{space.subtitle}</p>
              </div>
              <span className="shrink-0 rounded-md bg-[var(--sgi-red)]/12 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--sgi-red)]">
                {space.title.replace("Espace ", "")}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-[1] flex justify-center px-3 pt-4">
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sgi-blue)] font-display text-xs font-bold text-white ring-2 ring-[var(--sgi-gold)]/40"
            title={`${ROLE_LABELS[role]} — ${space.title}`}
          >
            {initials}
          </div>
        </div>
      )}

      <SidebarNavItems
        active={active}
        onNavigate={onNavigate}
        allowedModules={allowedModules}
        collapsed={collapsed}
      />

      <div className="relative z-[1] mt-auto border-t border-border p-3">
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13.5px] font-medium text-[var(--sgi-red)] transition duration-200 hover:bg-[var(--sgi-red)]/10 ${
            collapsed ? "justify-center" : ""
          }`}
          title="Déconnexion"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg">
            <LogOut size={17} strokeWidth={1.9} />
          </span>
          {!collapsed && <span>Déconnexion</span>}
        </button>
        {!collapsed && (
          <div className="mt-2 px-1">
            <DeveloperCredit variant="muted" />
          </div>
        )}
      </div>
    </>
  );
}

function Sidebar({
  active,
  setActive,
  collapsed,
  setCollapsed,
  allowedModules,
  role,
  onLogout,
}: {
  active: string;
  setActive: (k: ModuleKey) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  allowedModules: ModuleKey[];
  role: PlatformRole;
  onOpenSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <aside
      className="relative sticky top-0 hidden h-screen select-none flex-col overflow-hidden border-r border-border bg-card transition-[width] duration-300 ease-out md:flex"
      style={{ width: collapsed ? 88 : 272 }}
    >
      <div className="sgi-tricolor-rail absolute inset-y-0 left-0 w-[3px]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 0% 0%, rgba(200,151,26,0.14), transparent 70%), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(10,47,82,0.08), transparent 65%), radial-gradient(ellipse 50% 40% at 80% 20%, rgba(194,58,43,0.08), transparent 60%)",
        }}
        aria-hidden
      />
      <SidebarShell
        active={active}
        onNavigate={setActive}
        allowedModules={allowedModules}
        role={role}
        onLogout={onLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        showCollapse
      />
    </aside>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({
  title,
  role,
  onOpenProfile,
  onOpenSettings,
  onOpenContent,
  onLogout,
  profileMenuOpen,
  setProfileMenuOpen,
  sidebarOpen,
  setSidebarOpen,
}: {
  title: string;
  role: PlatformRole;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenContent: () => void;
  onLogout: () => void;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (value: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
}) {
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const space = ROLE_SPACE[role];
  const initials = ROLE_LABELS[role]
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="sgi-tricolor h-1 w-full" aria-hidden />
      <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground transition hover:bg-[var(--sgi-blue)]/10 md:hidden"
          aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-display text-base font-semibold text-foreground sm:text-lg">
              {title}
            </h1>
            <span className="hidden items-center rounded-md border border-[var(--sgi-gold)]/30 bg-[var(--sgi-gold)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-gold)] sm:inline-flex">
              {space.title}
            </span>
          </div>
          <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{space.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
        <a
          href="/"
          target="_blank"
          rel="noopener"
          className="hidden rounded-xl px-3 py-1.5 text-sm font-semibold text-[var(--sgi-blue)] transition hover:bg-[var(--sgi-blue)]/5 lg:inline-flex"
        >
          Site public
        </a>
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-[var(--sgi-gold)]/40 hover:text-[var(--sgi-gold)]"
          aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
          title={theme === "dark" ? "Mode clair" : "Mode sombre"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-40 rounded-xl border border-border bg-secondary/60 py-2 pl-9 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10 md:w-48"
            placeholder="Rechercher..."
          />
        </div>
        <button
          type="button"
          className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-secondary sm:inline-flex"
        >
          <Bell size={15} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--sgi-red)]" />
        </button>
        <div ref={profileMenuRef} className="relative border-l border-border pl-2">
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-secondary sm:px-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--sgi-blue)] text-xs font-bold text-white ring-2 ring-[var(--sgi-gold)]/35">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-foreground">{ROLE_LABELS[role]}</p>
              <p className="text-[11px] text-muted-foreground">{space.title}</p>
            </div>
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-lift)]">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setProfileMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary"
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                {theme === "dark" ? "Mode clair" : "Mode sombre"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenProfile();
                  setProfileMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary"
              >
                <UserRound size={15} />
                Mon profil
              </button>
              {(role === "admin" || role === "centre") && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSettings();
                    setProfileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary"
                >
                  <Settings size={15} />
                  Paramètres
                </button>
              )}
              {(role === "admin" || role === "centre") && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenContent();
                    setProfileMenuOpen(false);
                  }}
                  className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary"
                >
                  Gérer le contenu
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setProfileMenuOpen(false);
                }}
                className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm text-[var(--sgi-red)] hover:bg-[var(--sgi-red)]/8"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}

// ─── Dashboard Module ─────────────────────────────────────────────────────────

function Dashboard({ role }: { role: PlatformRole }) {
  return <RoleDashboard role={role} />;
}

// ─── Membres Module ───────────────────────────────────────────────────────────

function MembreDetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/50 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="mt-1.5 break-words text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function MembreDetail({ membre, onClose }: { membre: typeof membres[0]; onClose: () => void }) {
  const zoPaye = getMemberZaimuPaid(COLLECTES_SEED, membre, "zaimu-ordinaire");
  const zsPaye = getMemberZaimuPaid(COLLECTES_SEED, membre, "zaimu-special");
  const zsAssigne = getMemberSpecialAssignment(ZAIMU_SPECIAL_CAMPAIGN, membre);
  const zsReste = Math.max(0, zsAssigne - zsPaye);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sgi-tricolor h-1.5 w-full shrink-0" aria-hidden />

        <div
          className="relative shrink-0 overflow-hidden px-5 pb-5 pt-4 sm:px-6 sm:pt-5"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 0% 0%, rgba(200,151,26,0.18), transparent 55%), radial-gradient(ellipse 70% 100% at 100% 0%, rgba(10,47,82,0.14), transparent 50%), linear-gradient(180deg, color-mix(in srgb, var(--sgi-blue) 8%, transparent), transparent)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card/80 text-muted-foreground backdrop-blur hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3 pr-12">
            <MemberAvatar
              photo={membre.photo}
              prenom={membre.prenom}
              nom={membre.nom}
              size="xl"
              className="shadow-md"
            />
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatutBadge statut={membre.statut} />
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    membre.responsabilite === "Membre" || membre.responsabilite === "Membre simple"
                      ? "bg-muted text-muted-foreground"
                      : "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]"
                  }`}
                >
                  {membre.responsabilite === "Membre" ? "Membre simple" : membre.responsabilite}
                </span>
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                {membre.prenom} {membre.nom}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{membre.chapitre}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <a
              href={`mailto:${membre.email}`}
              className="rounded-2xl border border-border bg-card/90 px-3.5 py-3 text-sm shadow-sm backdrop-blur transition hover:border-[var(--sgi-blue)]/30"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Email</p>
              <p className="mt-1 truncate font-medium text-[var(--sgi-blue)]">{membre.email}</p>
            </a>
            <a
              href={`tel:${membre.telephone}`}
              className="rounded-2xl border border-border bg-card/90 px-3.5 py-3 text-sm shadow-sm backdrop-blur transition hover:border-[var(--sgi-blue)]/30"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Téléphone</p>
              <p className="mt-1 font-medium text-foreground">{membre.telephone}</p>
            </a>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Identité & pratique</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MembreDetailField label="Date de naissance" value={membre.dateNaissance} />
            <MembreDetailField label="Catégorie" value={membre.categorie} />
            <MembreDetailField label="Département" value={membre.departement} />
            <MembreDetailField label="Début de pratique" value={membre.dateDebutPratique} />
            <MembreDetailField label="Adhésion" value={membre.adhesion} />
            <MembreDetailField
              label="Vague de Paix"
              value={
                membre.abonnementVaguePaix ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Abonné (année en cours)</span>
                ) : (
                  "Non abonné"
                )
              }
            />
            <MembreDetailField
              label="Sokahan"
              value={
                membre.sokahan ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Oui</span>
                ) : (
                  "Non"
                )
              }
            />
          </div>

          <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Organisation</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MembreDetailField
              label="Responsabilité"
              value={membre.responsabilite === "Membre" ? "Membre simple" : membre.responsabilite}
            />
            <MembreDetailField label="Quartier" value={membre.quartier} />
            <MembreDetailField label="District" value={membre.district} />
            <MembreDetailField label="Groupe" value={membre.groupe} />
            <MembreDetailField
              label="Abonnement"
              value={
                membre.abonnement ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Actif</span>
                ) : (
                  "Inactif"
                )
              }
            />
          </div>

          <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Zaimu</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--sgi-gold)]/25 bg-[var(--sgi-gold)]/10 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-gold)]">Zaimu ordinaire</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {formatCdf(zoPaye)}
              </p>
              <p className="text-xs text-muted-foreground">CDF payés (validés)</p>
            </div>
            <div className="rounded-2xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-red)]">Zaimu spécial (cota)</p>
              <p className="mt-1 font-display text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {formatCdf(zsPaye)} / {formatCdf(zsAssigne)}
              </p>
              <p className="text-xs text-muted-foreground">Payé / assigné · reste {formatCdf(zsReste)} CDF</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:ml-auto sm:w-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

type MembresTab = "liste" | "indicateurs" | "cota" | "import-export";

const MEMBRES_TABS: { key: MembresTab; label: string; short: string; icon: typeof Users; hint: string }[] = [
  { key: "liste", label: "Liste des membres", short: "Liste", icon: Users, hint: "Recherche, filtres, ajout et fiches" },
  { key: "indicateurs", label: "Indicateurs", short: "Indicateurs", icon: BarChart3, hint: "Effectifs et bilans par période" },
  { key: "cota", label: "Cota Zaimu", short: "Cota Zaimu", icon: Target, hint: "Assigné, payé et reste par niveau" },
  { key: "import-export", label: "Import & export", short: "Import / Export", icon: FileUp, hint: "Template, import Excel, export PDF/Excel" },
];

function Membres({ role }: { role: PlatformRole }) {
  const orgScope = DEMO_ORG_SCOPE[role];
  const [activeTab, setActiveTab] = useState<MembresTab>("liste");
  const [chapitreFilter, setChapitreFilter] = useState(orgScope.chapitre || "Tous");
  const [districtFilter, setDistrictFilter] = useState(orgScope.district || "Tous");
  const [statutFilter, setStatutFilter] = useState("Tous");
  const [responsabiliteFilter, setResponsabiliteFilter] = useState("Tous");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof membres[0] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const emptyForm = {
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    dateNaissance: "",
    departement: "",
    categorie: "Homme",
    responsabilite: "Membre simple",
    dateDebutPratique: "",
    abonnementVaguePaix: true,
    sokahan: false,
    quartier: "",
    chapitre: orgScope.chapitre || CHAPITRES[1],
    district: orgScope.district || DISTRICTS[1],
    groupe: orgScope.groupe || "Groupe A",
    statut: "Actif",
    abonnement: true,
    photo: "",
  };
  const [formValues, setFormValues] = useState(emptyForm);
  const [members, setMembers] = useState(membres);
  const [formError, setFormError] = useState("");
  const scopedMembers = useMemo(() => filterMembersByScope(members, orgScope), [members, orgScope]);

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Veuillez sélectionner une image (JPG, PNG, WEBP…).");
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      setFormError("La photo ne doit pas dépasser 2,5 Mo.");
      return;
    }
    try {
      const photo = await readImageAsDataUrl(file);
      setFormValues((prev) => ({ ...prev, photo }));
      setFormError("");
    } catch {
      setFormError("Impossible de lire la photo. Réessayez.");
    }
  };

  const filtered = useMemo(() => scopedMembers.filter((m) => {
    if (chapitreFilter !== "Tous" && m.chapitre !== chapitreFilter) return false;
    if (districtFilter !== "Tous" && m.district !== districtFilter) return false;
    if (statutFilter !== "Tous" && m.statut !== statutFilter) return false;
    const roleLabel = m.responsabilite === "Membre" ? "Membre simple" : m.responsabilite;
    if (responsabiliteFilter !== "Tous" && roleLabel !== responsabiliteFilter) return false;
    if (search && !`${m.prenom} ${m.nom}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [chapitreFilter, districtFilter, statutFilter, responsabiliteFilter, search, scopedMembers]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formValues.prenom.trim() || !formValues.nom.trim() || !formValues.email.trim()) {
      setFormError("Le prénom, le nom et l’e-mail sont obligatoires.");
      return;
    }

    const newMember = createMemberFromForm(formValues, members as any);
    setMembers((prev) => [newMember, ...prev]);
    setShowForm(false);
    setFormValues(emptyForm);
    setFormError("");
  };

  const currentTab = MEMBRES_TABS.find((t) => t.key === activeTab) ?? MEMBRES_TABS[0];

  return (
    <div className="dash-page gap-5 sm:gap-6">
      {selected && <MembreDetail membre={selected} onClose={() => setSelected(null)} />}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">
              {ROLE_LABELS[role]} · Membres
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{currentTab.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{currentTab.hint}</p>
          </div>
          <p className="text-xs text-muted-foreground">{orgScope.label}</p>
        </div>
        <div className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 sm:px-3">
          {MEMBRES_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  if (tab.key !== "liste") setShowForm(false);
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--sgi-blue)] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={15} />
                <span className="whitespace-nowrap">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "indicateurs" && (
        <MembersKpiPanel role={role} members={members} collectes={COLLECTES_SEED} />
      )}

      {activeTab === "cota" && (
        <ZaimuQuotaPanel role={role} collectes={COLLECTES_SEED} />
      )}

      {activeTab === "import-export" && (
        <MembersImportExportBar
          members={members}
          filteredMembers={filtered}
          collectes={COLLECTES_SEED}
          scopeLabel={orgScope.label}
          onImport={(imported) => setMembers((prev) => [...imported, ...prev])}
        />
      )}

      {activeTab === "liste" && (
      <>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 flex-1 sm:min-w-[12rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Recherche</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="dash-field pl-8"
              placeholder="Nom du membre..." />
          </div>
        </div>
        {[
          ["Chapitre", CHAPITRES, chapitreFilter, setChapitreFilter, Boolean(orgScope.chapitre)],
          ["District", DISTRICTS, districtFilter, setDistrictFilter, Boolean(orgScope.district)],
          ["Statut", STATUTS, statutFilter, setStatutFilter, false],
          ["Responsabilité", RESPONSABILITE_FILTERS, responsabiliteFilter, setResponsabiliteFilter, false],
        ].map(([label, opts, val, set, locked]: any) => (
          <div key={label} className="w-full min-w-0 sm:w-auto sm:min-w-[9rem]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
            <select
              value={val}
              disabled={locked}
              onChange={(e) => set(e.target.value)}
              className="dash-field disabled:cursor-not-allowed disabled:opacity-70"
            >
              {opts.map((o: string) => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <button type="button" onClick={() => setShowForm((prev) => !prev)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:ml-auto sm:w-auto">
          <Plus size={14} /> {showForm ? "Fermer" : "Nouveau membre"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
          {formError && <div className="rounded-lg border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 px-3 py-2 text-sm text-[var(--sgi-red-deep)] dark:text-[var(--sgi-red-soft)] md:col-span-2">{formError}</div>}

          <div className="md:col-span-2 rounded-2xl border border-dashed border-[var(--sgi-blue)]/25 bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Photo du membre</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <MemberAvatar
                photo={formValues.photo}
                prenom={formValues.prenom || "N"}
                nom={formValues.nom || "M"}
                size="xl"
              />
              <div className="min-w-0 flex-1 space-y-2">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                  <Camera size={15} />
                  {formValues.photo ? "Changer la photo" : "Ajouter une photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
                {formValues.photo && (
                  <button
                    type="button"
                    onClick={() => setFormValues((prev) => ({ ...prev, photo: "" }))}
                    className="ml-0 block text-sm font-medium text-[var(--sgi-red)] hover:underline sm:ml-3 sm:inline"
                  >
                    Retirer la photo
                  </button>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP — 2,5 Mo max. Affichée dans la liste et la fiche détail.</p>
              </div>
            </div>
          </div>

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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Responsabilité
            </label>
            <select
              value={formValues.responsabilite}
              onChange={(e) => setFormValues((prev) => ({ ...prev, responsabilite: e.target.value }))}
              className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm"
            >
              {RESPONSABILITES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Précise si le membre est un membre simple ou un responsable.
            </p>
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Groupe</label>
            <select value={formValues.groupe} onChange={(e) => setFormValues((prev) => ({ ...prev, groupe: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm">
              {["Groupe A", "Groupe B", "Groupe C", "Groupe D"].map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
            <select value={formValues.statut} onChange={(e) => setFormValues((prev) => ({ ...prev, statut: e.target.value }))} className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm">
              {STATUTS.filter((s) => s !== "Tous").map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={formValues.abonnementVaguePaix} onChange={(e) => setFormValues((prev) => ({ ...prev, abonnementVaguePaix: e.target.checked }))} />
              Abonnement Vague de Paix de l’année en cours
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={formValues.sokahan} onChange={(e) => setFormValues((prev) => ({ ...prev, sokahan: e.target.checked }))} />
              Sokahan (possède le Gohonzon)
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
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">{filtered.length} membre{filtered.length !== 1 ? "s" : ""}</span>
          <button
            type="button"
            onClick={() => setActiveTab("import-export")}
            className="text-xs font-medium text-[var(--sgi-blue)] hover:underline"
          >
            Import / Export →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Membre", "Responsabilité", "Chapitre", "District", "Statut", "Zaimu ord.", "Zaimu sp. (payé/cota)", "Vague de Paix", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const zoPaye = getMemberZaimuPaid(COLLECTES_SEED, m, "zaimu-ordinaire");
                const zsPaye = getMemberZaimuPaid(COLLECTES_SEED, m, "zaimu-special");
                const zsAssigne = getMemberSpecialAssignment(ZAIMU_SPECIAL_CAMPAIGN, m);
                const zsReste = Math.max(0, zsAssigne - zsPaye);
                return (
                <tr key={m.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${i === filtered.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar photo={m.photo} prenom={m.prenom} nom={m.nom} size="sm" />
                      <div>
                        <div className="font-medium text-foreground">{m.prenom} {m.nom}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        (m.responsabilite === "Membre" || m.responsabilite === "Membre simple")
                          ? "bg-muted text-muted-foreground"
                          : "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]"
                      }`}
                    >
                      {m.responsabilite === "Membre" ? "Membre simple" : m.responsabilite}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.chapitre.split("–")[1]?.trim()}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.district}</td>
                  <td className="px-4 py-3"><StatutBadge statut={m.statut} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{formatCdf(zoPaye)}</td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-foreground">{formatCdf(zsPaye)} / {formatCdf(zsAssigne)}</div>
                    <div className="text-[10px] text-muted-foreground">Reste {formatCdf(zsReste)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {m.abonnementVaguePaix
                      ? <CheckCircle size={14} className="text-emerald-500" />
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RowActionsMenu
                      actions={[
                        {
                          label: "Voir le détail",
                          icon: <Eye size={14} />,
                          onClick: () => setSelected(m),
                        },
                        {
                          label: "Modifier",
                          icon: <Edit2 size={14} />,
                          onClick: () => setSelected(m),
                        },
                        {
                          label: "Désactiver",
                          icon: <UserX size={14} />,
                          tone: "danger",
                          onClick: () => {
                            if (window.confirm(`Désactiver ${m.prenom} ${m.nom} ?`)) {
                              setMembers((prev) =>
                                prev.map((member) =>
                                  member.id === m.id ? { ...member, statut: "Suspendu" } : member,
                                ),
                              );
                            }
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
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
    <div className="dash-page">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          { label: "Cotisations validées", value: totaux.cotisations, color: "text-[var(--sgi-blue)]", bg: "bg-[var(--sgi-blue)]/10" },
          { label: "Dons Zaimu validés", value: totaux.dons, color: "text-[var(--sgi-gold)]", bg: "bg-[var(--sgi-gold)]/15" },
          { label: "Abonnements validés", value: totaux.abonnements, color: "text-[var(--sgi-red)]", bg: "bg-[var(--sgi-red)]/10" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className={`${bg} ${color} rounded-lg p-2.5`}>
              <Wallet size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className={`truncate text-lg font-bold ${color}`} style={{ fontFamily: "var(--font-mono)" }}>{fmt(value)}</div>
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
          <div className="grid grid-cols-1 gap-3 border-t border-border px-4 py-4 sm:grid-cols-2 sm:px-5 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}
                className="dash-field">
                {["Cotisation", "Don Zaimu", "Abonnement"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Membre</label>
              <select value={formMembre} onChange={(e) => setFormMembre(e.target.value)}
                className="dash-field">
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
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <span className="text-sm font-medium text-foreground">Transactions récentes</span>
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            {types.map((t) => (
              <button key={t} type="button" onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${typeFilter === t ? "bg-[var(--sgi-blue)] text-white" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
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
    <div className="dash-page">
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
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90">
                <Send size={13} /> Publier
              </button>
              <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary">
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
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Calendar size={10} /> {d.date}</span>
                  <span className="inline-flex items-center gap-1"><Target size={10} /> {d.audience}</span>
                  <span className="inline-flex items-center gap-1"><BookOpen size={10} /> {d.auteur}</span>
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
    <div className="dash-page">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Exporter les statistiques
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Rapport PDF / Excel structuré pour la période sélectionnée.
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end lg:w-auto">
            <div className="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Du</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="dash-field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Au</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="dash-field" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={exportStatsPdf}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <Download size={14} /> Export PDF
              </button>
              <button
                type="button"
                onClick={exportStatsExcel}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--sgi-gold)]/40 bg-[var(--sgi-gold)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--sgi-gold)] transition hover:bg-[var(--sgi-gold)]/20"
              >
                <Download size={14} /> Export Excel
              </button>
            </div>
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

type SettingsTab = "users" | "rbac" | "general";

function SettingsModule({ currentUserRole }: { currentUserRole: PlatformRole }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [selectedRole, setSelectedRole] = useState<PlatformRole>("admin");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(INITIAL_PROFILES[0]);
  const [rbacMatrix, setRbacMatrix] = useState(RBAC_MATRIX);
  const [appSettings, setAppSettings] = useState({ darkMode: false, emailAlerts: true, autoUpdates: false });

  const updateProfile = (id: number, patch: Partial<Profile>) => {
    setProfiles((current) => current.map((profile) => profile.id === id ? { ...profile, ...patch } : profile));
    setSelectedProfile((current) => current && current.id === id ? { ...current, ...patch } : current);
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
      telephone: "",
      quartier: "",
      bio: "",
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "users":
        return (
          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-4">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <div className="text-sm font-semibold text-foreground">Gestion des utilisateurs</div>
                  <div className="text-xs text-muted-foreground">Ajouter, modifier et gérer les profils</div>
                </div>
                <button
                  type="button"
                  onClick={addNewProfile}
                  className="rounded-lg bg-[var(--sgi-blue)] px-3 py-2 text-xs font-medium text-white sm:py-1.5"
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
                        <td className="px-4 py-3">
                          <RowActionsMenu
                            actions={[
                              {
                                label: "Voir",
                                icon: <Eye size={14} />,
                                onClick: () => setSelectedProfile(profile),
                              },
                              {
                                label: "Supprimer",
                                icon: <UserX size={14} />,
                                tone: "danger",
                                onClick: () => {
                                  if (window.confirm(`Supprimer ${profile.name} ?`)) {
                                    setProfiles((current) => current.filter((item) => item.id !== profile.id));
                                  }
                                },
                              },
                            ]}
                          />
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
    <div className="dash-page">
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Paramètres</div>
            <div className="text-xs text-muted-foreground">Utilisateurs, RBAC et options générales (admin / centre).</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
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
  collectes: "Collectes — Vague de Paix & Zaimu",
  finances: "Module Finances",
  directives: "Directives & Communications",
  statistiques: "Statistiques & Analyses",
  profil: "Mon profil",
  settings: "Paramètres & RBAC",
};

const DASHBOARD_ROLE_BY_PATH: Record<string, PlatformRole> = {
  "/dashboard/admin": "admin",
  "/dashboard/centre": "centre",
  "/dashboard/chapitre": "chapitre",
  "/dashboard/district": "district",
  "/dashboard/groupe": "groupe",
};

function readStoredRole(): PlatformRole | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem("sgi-current-role");
  if (saved && ALLOWED_ROLES.includes(saved as PlatformRole)) {
    return saved as PlatformRole;
  }
  return null;
}

function roleFromPath(pathname: string): PlatformRole | null {
  return DASHBOARD_ROLE_BY_PATH[pathname] ?? null;
}

function resolveInitialRole(pathname: string): PlatformRole | null {
  return readStoredRole() ?? roleFromPath(pathname);
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<PlatformRole | null>(() =>
    resolveInitialRole(typeof window !== "undefined" ? window.location.pathname : location.pathname),
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    const resolved = readStoredRole() ?? roleFromPath(location.pathname);
    if (resolved) {
      setCurrentUserRole(resolved);
      window.localStorage.setItem("sgi-current-role", resolved);
      return;
    }
    navigate("/login", { replace: true });
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!currentUserRole) return;
    window.localStorage.setItem("sgi-current-role", currentUserRole);
  }, [currentUserRole]);

  const allowedModules = useMemo(
    () => (currentUserRole ? MODULE_ACCESS[currentUserRole] : []),
    [currentUserRole],
  );

  useEffect(() => {
    if (!currentUserRole) return;
    if (!allowedModules.includes(activeModule)) {
      setActiveModule("dashboard");
    }
  }, [allowedModules, activeModule, currentUserRole]);

  const switchModule = (module: ModuleKey) => {
    if (allowedModules.includes(module)) {
      setActiveModule(module);
    }
  };

  const handleOpenProfile = () => {
    switchModule("profil");
    setProfileMenuOpen(false);
    setSidebarOpen(false);
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
    setCurrentUserRole(null);
    navigate("/login", { replace: true });
  };

  if (!currentUserRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--sgi-surface)] text-sm text-muted-foreground">
        Chargement de votre espace…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "var(--font-sans)" }}>
      <Sidebar
        active={activeModule}
        setActive={switchModule}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        allowedModules={allowedModules}
        role={currentUserRole}
        onOpenSettings={handleOpenSettings}
        onLogout={handleLogout}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--sgi-blue-deep)]/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="sgi-drawer-panel absolute left-0 top-0 flex h-full w-[min(300px,88vw)] flex-col bg-card shadow-[var(--shadow-lift)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 0% 0%, rgba(200,151,26,0.10), transparent 70%), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(10,47,82,0.06), transparent 65%)",
              }}
              aria-hidden
            />
            <SidebarShell
              active={activeModule}
              onNavigate={handleNavigate}
              allowedModules={allowedModules}
              role={currentUserRole}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title={MODULE_TITLES[activeModule]}
          role={currentUserRole}
          onOpenProfile={handleOpenProfile}
          onOpenSettings={handleOpenSettings}
          onOpenContent={handleOpenContent}
          onLogout={handleLogout}
          profileMenuOpen={profileMenuOpen}
          setProfileMenuOpen={setProfileMenuOpen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main
          className="flex-1 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,0,0,0.1) transparent",
          }}
        >
          {activeModule === "dashboard" && <Dashboard role={currentUserRole} />}
          {activeModule === "contenu" && (currentUserRole === "admin" || currentUserRole === "centre") && (
            <AdminEditLanding />
          )}
          {activeModule === "membres" && <Membres role={currentUserRole} />}
          {activeModule === "collectes" && <CollectesModule role={currentUserRole} />}
          {activeModule === "finances" && <Finances />}
          {activeModule === "directives" && <Directives />}
          {activeModule === "statistiques" && <Statistiques />}
          {activeModule === "profil" && <ProfilePage role={currentUserRole} />}
          {activeModule === "settings" && <SettingsModule currentUserRole={currentUserRole} />}
          <footer className="border-t border-border px-4 py-3 sm:px-6">
            <DeveloperCredit variant="muted" className="text-center sm:text-left" />
          </footer>
        </main>
      </div>

      <DashboardAiAssistant role={currentUserRole} />
    </div>
  );
}
