import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import * as XLSX from "xlsx";
import { parseISO, format } from "date-fns";
import {
  LayoutDashboard, Users, FileText, BarChart3,
  Bell, Search, Plus, Filter, Eye, Edit2, UserX, Trash2,
  Download, ChevronRight, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, TrendingUp,
  CheckCircle, Clock, XCircle, Send, Globe, BookOpen,
  Calendar, Target, X, Menu, LogOut, Settings, Layers,
  ChevronLeft, SquarePen, Moon, Sun, HeartHandshake, FileUp, UserRound,
  Shield, Layers3, MapPinned, UsersRound,
} from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from "recharts";
import sgiLogo from "../../image/logo-sgi.jpg";
import { type MemberRecord } from "./memberFormUtils";
import { memberFullName } from "./membersData";
import PersonCreateForm from "./PersonCreateForm";
import { DashboardAiAssistant } from "../components/ai/DashboardAiAssistant";
import { DeveloperCredit } from "../components/DeveloperCredit";
import { MemberAvatar } from "./MemberAvatar";
import AdminEditLanding from "../pages/AdminEditLanding";
import CollectesModule, { type CollecteRecord, type CollecteTab } from "./CollectesModule";
import {
  buildPendingPaymentNotifications,
  canReceivePendingPaymentNotifications,
  loadReadNotificationIds,
  markNotificationsRead,
  type CollecteNavFocus,
} from "./pendingCollecteNotifications";
import { useConfirm } from "./ConfirmDialog";
import RoleDashboard from "./RoleDashboard";
import MembersKpiPanel from "./MembersKpiPanel";
import MembersImportExportBar from "./MembersImportExportBar";
import ProfilePage from "./ProfilePage";
import {
  buildStatsBreakdown,
  computeMemberListKpis,
  DEMO_ORG_SCOPE,
  filterCollectesByScope,
  filterMembersByScope,
  orgScopeFromProfile,
  primaryOrgUnitKind,
  primaryOrgUnitLabel,
  statsBreakdownLabel,
  statsBreakdownUnitForRole,
  type OrgScope,
} from "./memberListStats";
import { exportStatisticsPdf } from "./statsExport";
import {
  formatFcfa,
  getMemberZaimuPaid,
} from "./zaimuQuota";
import {
  listQuotaAssignments,
  listSpecialCampaigns,
  type ZaimuCampaign,
} from "../services/quotaService";
import { RowActionsMenu } from "./RowActionsMenu";
import { ALLOWED_ROLES, ROLE_LABELS, type ModuleKey, type PlatformRole } from "./roles";
import { useOrgTree } from "./useOrgTree";
import { OpsDataProvider, useOpsData } from "./opsDataStore";
import SettingsModule from "./settings/SettingsModule";
import { loadModuleAccess, RBAC_CHANGED_EVENT } from "./settings/rbacStore";
import ChapitresModule from "./org/ChapitresModule";
import DistrictsModule from "./org/DistrictsModule";
import GroupesModule from "./org/GroupesModule";
import { assignableRoles } from "./settings/usersStore";
import {
  canChangeMemberResponsabilite,
  canDeactivateMember,
  canDeleteMember,
  canEditMember,
} from "./orgAccess";
import { deleteMemberRemote, hasRemoteMembers, setMemberStatusRemote } from "../services/memberService";
import { signOut } from "../services/authService";
import { fetchMyProfile, hasRemoteProfiles, inviteUserRemote } from "../services/profileService";
import { resolveOrgIds } from "../services/orgService";
import { PROFILE_UPDATED_EVENT } from "./profilesData";

type SessionProfile = {
  name: string;
  photo: string;
  orgScope: OrgScope;
};

// ─── Data ────────────────────────────────────────────────────────────────────

const STATUTS = ["Tous", "Actif", "En attente", "Suspendu"];
const RESPONSABILITES = [
  "Membre simple",
  "Responsable groupe",
  "Responsable district",
  "Responsable chapitre",
  "Responsable centre",
] as const;
const RESPONSABILITE_FILTERS = ["Tous", ...RESPONSABILITES] as const;

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
    contenu: "La quatrième saison de l'abonnement Vague de Paix est officiellement ouverte. Les membres souhaitant s'abonner peuvent le faire auprès de leur responsable de chapitre ou via le portail en ligne. Tarif : 5 000 FCFA par mois."
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
  { key: "contenu", label: "Contenu", icon: SquarePen, group: "gestion" },
  { key: "chapitres", label: "Chapitres", icon: Layers3, group: "organisation" },
  { key: "districts", label: "Districts", icon: MapPinned, group: "organisation" },
  { key: "groupes", label: "Groupes", icon: UsersRound, group: "organisation" },
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
    { id: "organisation", label: "Organisation" },
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
  sessionProfile,
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
  sessionProfile: SessionProfile;
  onLogout: () => void;
  collapsed?: boolean;
  setCollapsed?: (value: boolean) => void;
  onClose?: () => void;
  showCollapse?: boolean;
}) {
  const space = ROLE_SPACE[role];
  const displayName = sessionProfile.name || ROLE_LABELS[role];
  const unitKind = primaryOrgUnitKind(role);
  const unitName = primaryOrgUnitLabel(role, sessionProfile.orgScope);

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
              <MemberAvatar photo={sessionProfile.photo} name={displayName} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABELS[role]}</p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--sgi-blue)]" title={`${unitKind} ${unitName}`}>
                  {unitKind} · {unitName}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-[var(--sgi-red)]/12 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--sgi-red)]">
                {space.title.replace("Espace ", "")}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-[1] flex justify-center px-3 pt-4">
          <MemberAvatar
            photo={sessionProfile.photo}
            name={displayName}
            size="md"
            className="ring-2 ring-[var(--sgi-gold)]/40"
          />
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
  sessionProfile,
  onLogout,
}: {
  active: string;
  setActive: (k: ModuleKey) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  allowedModules: ModuleKey[];
  role: PlatformRole;
  sessionProfile: SessionProfile;
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
        sessionProfile={sessionProfile}
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
  sessionProfile,
  onOpenProfile,
  onOpenSettings,
  onOpenContent,
  onOpenCollectes,
  onLogout,
  profileMenuOpen,
  setProfileMenuOpen,
  sidebarOpen,
  setSidebarOpen,
}: {
  title: string;
  role: PlatformRole;
  sessionProfile: SessionProfile;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenContent: () => void;
  onOpenCollectes: (focus?: CollecteNavFocus) => void;
  onLogout: () => void;
  profileMenuOpen: boolean;
  setProfileMenuOpen: (value: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
}) {
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { collectes } = useOpsData();
  const [notifOpen, setNotifOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadNotificationIds());
  const space = ROLE_SPACE[role];
  const displayName = sessionProfile.name || ROLE_LABELS[role];
  const unitKind = primaryOrgUnitKind(role);
  const unitName = primaryOrgUnitLabel(role, sessionProfile.orgScope);

  const notifications = useMemo(
    () => buildPendingPaymentNotifications(collectes, role, sessionProfile.orgScope),
    [collectes, role, sessionProfile.orgScope],
  );
  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;
  const showNotifBell = canReceivePendingPaymentNotifications(role);

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

  useEffect(() => {
    if (!notifOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notifOpen]);

  const openNotification = (item: { id: string; tab: CollecteTab }) => {
    markNotificationsRead([item.id]);
    setReadIds(loadReadNotificationIds());
    setNotifOpen(false);
    onOpenCollectes({ tab: item.tab, statut: "En attente", nonce: Date.now() });
  };

  const markAllRead = () => {
    if (notifications.length === 0) return;
    markNotificationsRead(notifications.map((item) => item.id));
    setReadIds(loadReadNotificationIds());
  };

  const toggleNotifOpen = () => {
    setProfileMenuOpen(false);
    if (!notifOpen && notifications.length > 0) {
      // Ouvrir le panneau = notifications consultées → badge décrémenté.
      markNotificationsRead(notifications.map((item) => item.id));
      setReadIds(loadReadNotificationIds());
    }
    setNotifOpen((open) => !open);
  };

  const badgeCount = unreadCount;

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
            {(role === "chapitre" || role === "district" || role === "groupe") && (
              <span className="hidden max-w-[16rem] truncate items-center rounded-md border border-[var(--sgi-blue)]/25 bg-[var(--sgi-blue)]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sgi-blue)] lg:inline-flex">
                {unitKind} · {unitName}
              </span>
            )}
          </div>
          <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
            {(role === "chapitre" || role === "district" || role === "groupe")
              ? `Vous pilotez le ${unitKind.toLowerCase()} ${unitName}`
              : space.subtitle}
          </p>
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
        {showNotifBell && (
          <div ref={notifMenuRef} className="relative">
            <button
              type="button"
              onClick={toggleNotifOpen}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-secondary"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={15} />
              {badgeCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sgi-red)] px-1 text-[10px] font-bold text-white">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    <p className="text-[11px] text-muted-foreground">
                      Paiements en attente de validation
                    </p>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="text-[11px] font-semibold text-[var(--sgi-blue)] hover:underline"
                    >
                      Tout lu
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Aucun paiement en attente dans votre périmètre.
                    </p>
                  ) : (
                    notifications.slice(0, 12).map((item) => {
                      const unread = !readIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openNotification(item)}
                          className={`flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-secondary/50 ${
                            unread ? "bg-[var(--sgi-gold)]/5" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            {unread && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--sgi-red)]" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.body}</p>
                          <p className="text-[11px] text-muted-foreground">{item.date}</p>
                        </button>
                      );
                    })
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="border-t border-border p-2">
                    <button
                      type="button"
                      onClick={() => {
                        markAllRead();
                        setNotifOpen(false);
                        onOpenCollectes({
                          tab: notifications[0]?.tab || "vague-paix",
                          statut: "En attente",
                          nonce: Date.now(),
                        });
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-[var(--sgi-blue)] hover:bg-secondary"
                    >
                      Voir tous les paiements en attente
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div ref={profileMenuRef} className="relative border-l border-border pl-2">
          <button
            type="button"
            onClick={() => {
              setNotifOpen(false);
              setProfileMenuOpen(!profileMenuOpen);
            }}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-secondary sm:px-2"
          >
            <MemberAvatar
              photo={sessionProfile.photo}
              name={displayName}
              size="md"
              className="!h-9 !w-9 ring-2 ring-[var(--sgi-gold)]/35"
            />
            <div className="hidden text-left sm:block">
              <p className="max-w-[10rem] truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[role]}</p>
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
              {(role === "admin" || role === "centre" || role === "chapitre") && (
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

function Dashboard({ role, orgScope }: { role: PlatformRole; orgScope: OrgScope }) {
  return <RoleDashboard role={role} orgScope={orgScope} />;
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
      <div className="mt-1.5 break-words text-sm font-semibold text-foreground">{value || "—"}</div>
    </div>
  );
}

function FinanceStat({
  label,
  value,
  hint,
  tone = "blue",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "blue" | "gold" | "red" | "green";
}) {
  const toneClass = {
    blue: "border-[var(--sgi-blue)]/20 bg-[var(--sgi-blue)]/8 text-[var(--sgi-blue)]",
    gold: "border-[var(--sgi-gold)]/25 bg-[var(--sgi-gold)]/10 text-[var(--sgi-gold)]",
    red: "border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 text-[var(--sgi-red)]",
    green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  }[tone];
  return (
    <div className={`rounded-2xl border p-3.5 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-90">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

type SpecialEngagementRow = {
  campaign: ZaimuCampaign;
  engagement: number;
  paye: number;
  reste: number;
  surplus: number;
};

function memberPayments(
  collectes: CollecteRecord[],
  fullName: string,
  type?: CollecteRecord["type"],
) {
  const name = fullName.trim().toLowerCase();
  return collectes
    .filter((c) => c.membre.trim().toLowerCase() === name)
    .filter((c) => (type ? c.type === type : true))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function sumValidated(rows: CollecteRecord[]) {
  return rows.filter((c) => c.statut === "Validé").reduce((sum, c) => sum + c.montant, 0);
}

function MembreDetail({
  membre,
  canEdit = false,
  onClose,
  onEdit,
}: {
  membre: MemberRecord;
  canEdit?: boolean;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const { collectes } = useOpsData();
  const fullName = memberFullName(membre);
  const [engagements, setEngagements] = useState<SpecialEngagementRow[]>([]);
  const [engagementsLoading, setEngagementsLoading] = useState(true);

  const vpRows = useMemo(
    () => memberPayments(collectes, fullName, "vague-paix"),
    [collectes, fullName],
  );
  const zoRows = useMemo(
    () => memberPayments(collectes, fullName, "zaimu-ordinaire"),
    [collectes, fullName],
  );
  const zsRows = useMemo(
    () => memberPayments(collectes, fullName, "zaimu-special"),
    [collectes, fullName],
  );
  const allMemberRows = useMemo(
    () => memberPayments(collectes, fullName),
    [collectes, fullName],
  );

  const vpPaye = sumValidated(vpRows);
  const zoPaye = sumValidated(zoRows);
  const zsPaye = sumValidated(zsRows);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setEngagementsLoading(true);
      const { data: campaigns } = await listSpecialCampaigns();
      const active = (campaigns || []).filter((c) => c.is_active);
      const rows: SpecialEngagementRow[] = [];
      for (const campaign of active) {
        const { data: assignments } = await listQuotaAssignments(campaign.id);
        const membreRow = (assignments || []).find(
          (a) => a.level === "membre" && a.member_id && a.member_id === membre.remoteId,
        );
        // Engagement = cota individuelle uniquement (pas la cota du groupe / district).
        const engagement = Number(membreRow?.assigne || 0);
        const paye = zsRows
          .filter((c) => c.statut === "Validé")
          .filter((c) => {
            const label = campaign.label.trim().toLowerCase();
            return (
              (c.periode || "").trim().toLowerCase() === label ||
              (c.motif || "").trim().toLowerCase() === label
            );
          })
          .reduce((sum, c) => sum + c.montant, 0);
        if (engagement <= 0 && paye <= 0) continue;
        rows.push({
          campaign,
          engagement,
          paye,
          reste: Math.max(0, engagement - paye),
          surplus: Math.max(0, paye - engagement),
        });
      }
      if (!cancelled) {
        setEngagements(rows);
        setEngagementsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [membre.chapitre, membre.district, membre.groupe, membre.remoteId, zsRows]);

  const zsEngagementTotal = engagements.reduce((sum, row) => sum + row.engagement, 0);
  const zsResteTotal = Math.max(0, zsEngagementTotal - zsPaye);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
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
                {membre.abonnementVaguePaix && (
                  <span className="rounded-full bg-[var(--sgi-blue)]/12 px-2.5 py-0.5 text-[11px] font-bold text-[var(--sgi-blue)]">
                    Vague de Paix
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                {membre.prenom} {membre.nom}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {[membre.groupe, membre.district, membre.chapitre].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <FinanceStat
              label="Vague de Paix"
              value={`${formatFcfa(vpPaye)} FCFA`}
              hint={
                membre.abonnementVaguePaix
                  ? `${vpRows.filter((r) => r.statut === "Validé").length} paiement(s) · abonné`
                  : `${vpRows.filter((r) => r.statut === "Validé").length} paiement(s) · non abonné`
              }
              tone="blue"
            />
            <FinanceStat
              label="Zaimu ordinaire"
              value={`${formatFcfa(zoPaye)} FCFA`}
              hint={`${zoRows.filter((r) => r.statut === "Validé").length} paiement(s) validé(s)`}
              tone="gold"
            />
            <FinanceStat
              label="Zaimu spécial"
              value={`${formatFcfa(zsPaye)} FCFA`}
              hint={
                zsEngagementTotal > 0
                  ? `Engagement ${formatFcfa(zsEngagementTotal)} · reste ${formatFcfa(zsResteTotal)}`
                  : `${zsRows.filter((r) => r.statut === "Validé").length} paiement(s)`
              }
              tone="red"
            />
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Identité & pratique
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MembreDetailField label="Email" value={membre.email} />
            <MembreDetailField label="Téléphone" value={membre.telephone} />
            <MembreDetailField label="Date de naissance" value={membre.dateNaissance} />
            <MembreDetailField label="Catégorie" value={membre.categorie || membre.departement} />
            <MembreDetailField label="Département" value={membre.departement || "—"} />
            <MembreDetailField label="Début de pratique" value={membre.dateDebutPratique} />
            <MembreDetailField label="Adhésion" value={membre.adhesion} />
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
            <MembreDetailField
              label="Abonnement général"
              value={
                membre.abonnement ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Actif</span>
                ) : (
                  "Inactif"
                )
              }
            />
          </div>

          <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Organisation
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MembreDetailField
              label="Responsabilité"
              value={membre.responsabilite === "Membre" ? "Membre simple" : membre.responsabilite}
            />
            <MembreDetailField label="Chapitre" value={membre.chapitre} />
            <MembreDetailField label="District" value={membre.district} />
            <MembreDetailField label="Groupe" value={membre.groupe} />
            <MembreDetailField label="Quartier" value={membre.quartier} />
          </div>

          <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Abonnement Vague de Paix
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MembreDetailField
              label="Statut"
              value={
                membre.abonnementVaguePaix ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Abonné</span>
                ) : (
                  "Non abonné"
                )
              }
            />
            <MembreDetailField label="Total payé (validé)" value={`${formatFcfa(vpPaye)} FCFA`} />
            <MembreDetailField
              label="Dernier paiement"
              value={vpRows[0] ? `${vpRows[0].date} · ${formatFcfa(vpRows[0].montant)} FCFA` : "—"}
            />
          </div>

          <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Zaimu ordinaire
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MembreDetailField label="Total payé (validé)" value={`${formatFcfa(zoPaye)} FCFA`} />
            <MembreDetailField
              label="Nombre de paiements"
              value={String(zoRows.filter((r) => r.statut === "Validé").length)}
            />
            <MembreDetailField
              label="Dernier paiement"
              value={zoRows[0] ? `${zoRows[0].date} · ${formatFcfa(zoRows[0].montant)} FCFA` : "—"}
            />
          </div>

          <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Zaimu spécial — engagements
          </p>
          {engagementsLoading ? (
            <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Chargement des engagements…
            </p>
          ) : engagements.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Aucun engagement de campagne pour ce périmètre.
              {zsPaye > 0 && (
                <span className="mt-1 block text-foreground">
                  Payé au total : {formatFcfa(zsPaye)} FCFA (validé).
                </span>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Campagne", "Engagement", "Payé", "Reste", "Surplus"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {engagements.map((row) => (
                    <tr key={row.campaign.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-foreground">{row.campaign.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.campaign.date_echeance
                            ? `Échéance ${new Date(row.campaign.date_echeance).toLocaleDateString("fr-FR")}`
                            : "Sans échéance"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-mono">{formatFcfa(row.engagement)}</td>
                      <td className="px-3 py-2.5 font-mono text-emerald-700 dark:text-emerald-400">
                        {formatFcfa(row.paye)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[var(--sgi-red)]">
                        {formatFcfa(row.reste)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[var(--sgi-gold)]">
                        {formatFcfa(row.surplus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Historique des paiements
          </p>
          {allMemberRows.length === 0 ? (
            <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Aucun paiement enregistré pour ce membre.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["N°", "Date", "Type", "Montant", "Campagne / période", "Statut"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allMemberRows.slice(0, 12).map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {row.numero || row.id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.date}</td>
                      <td className="px-3 py-2 text-xs">
                        {row.type === "vague-paix"
                          ? "Vague de Paix"
                          : row.type === "zaimu-ordinaire"
                            ? "Zaimu ordinaire"
                            : "Zaimu spécial"}
                      </td>
                      <td className="px-3 py-2 font-mono font-medium">
                        {formatFcfa(row.montant)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {row.periode || row.motif || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            row.statut === "Validé"
                              ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                              : row.statut === "Annulé"
                                ? "bg-[var(--sgi-red)]/12 text-[var(--sgi-red)]"
                                : "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]"
                          }`}
                        >
                          {row.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allMemberRows.length > 12 && (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">
                  + {allMemberRows.length - 12} autre(s) paiement(s)
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted sm:w-auto"
            >
              <Edit2 size={14} /> Modifier les informations
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

type MembresTab = "liste" | "import-export";

const MEMBRES_TABS: { key: MembresTab; label: string; short: string; icon: typeof Users; hint: string }[] = [
  { key: "liste", label: "Liste des membres", short: "Liste", icon: Users, hint: "Recherche, filtres, ajout et fiches" },
  { key: "import-export", label: "Import & export", short: "Import / Export", icon: FileUp, hint: "Template, import Excel, export PDF/Excel" },
];

function suggestedPlatformRole(responsabilite: string): PlatformRole {
  const value = responsabilite === "Membre" ? "Membre simple" : responsabilite;
  if (value === "Responsable centre") return "centre";
  if (value === "Responsable chapitre") return "chapitre";
  if (value === "Responsable district") return "district";
  return "groupe";
}

function platformRoleToResponsabilite(role: PlatformRole): string {
  if (role === "centre") return "Responsable centre";
  if (role === "chapitre") return "Responsable chapitre";
  if (role === "district") return "Responsable district";
  if (role === "groupe") return "Responsable groupe";
  return "Membre simple";
}

function Membres({ role }: { role: PlatformRole }) {
  const { confirm } = useConfirm();
  const orgTree = useOrgTree();
  const {
    members,
    setMembers,
    collectes,
    reloadMembers,
    loading: membersLoading,
    error: membersError,
  } = useOpsData();
  const canPromote = assignableRoles(role).length > 0;
  const [orgScope, setOrgScope] = useState<OrgScope>(() => DEMO_ORG_SCOPE[role]);
  const [activeTab, setActiveTab] = useState<MembresTab>("liste");
  const [chapitreFilter, setChapitreFilter] = useState("Tous");
  const [districtFilter, setDistrictFilter] = useState("Tous");
  const [statutFilter, setStatutFilter] = useState("Tous");
  const [responsabiliteFilter, setResponsabiliteFilter] = useState("Tous");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<MemberRecord | null>(null);
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<MemberRecord | null>(null);
  const [promoteRole, setPromoteRole] = useState<PlatformRole>("groupe");
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [promoteInfo, setPromoteInfo] = useState<string | null>(null);
  const [memberToast, setMemberToast] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [memberZsAssigneById, setMemberZsAssigneById] = useState<Record<string, number>>({});
  const MEMBERS_PAGE_SIZE = 10;
  // Centre / admin : aucun filtre de périmètre → tous les membres + responsables rattachés.
  const scopedMembers = useMemo(() => filterMembersByScope(members, orgScope), [members, orgScope]);
  const chapitreFilterOptions = useMemo(
    () => ["Tous", ...orgTree.chapitres.map((item) => item.name)],
    [orgTree.chapitres],
  );
  const districtFilterOptions = useMemo(() => {
    if (chapitreFilter === "Tous") {
      return ["Tous", ...orgTree.districts.map((item) => item.name)];
    }
    const chapitre = orgTree.chapitres.find((item) => item.name === chapitreFilter);
    const districts = chapitre
      ? orgTree.districtsForChapitreId(chapitre.id).map((item) => item.name)
      : [];
    return ["Tous", ...districts];
  }, [chapitreFilter, orgTree]);

  useEffect(() => {
    let cancelled = false;
    async function loadScope() {
      if (hasRemoteProfiles()) {
        const { data } = await fetchMyProfile();
        if (!cancelled && data) {
          let chapitre = data.chapitre_name || "";
          let district = data.district_name || "";
          let groupe = data.groupe_name || "";
          if ((!chapitre || !district || !groupe) && (data.chapitre_id || data.district_id || data.groupe_id)) {
            const names = orgTree.nameOf({
              chapitreId: data.chapitre_id || "",
              districtId: data.district_id || "",
              groupeId: data.groupe_id || "",
            });
            chapitre = chapitre || names.chapitre;
            district = district || names.district;
            groupe = groupe || names.groupe;
          }
          const scope = orgScopeFromProfile(role, { chapitre, district, groupe });
          setOrgScope(scope);
          setChapitreFilter(scope.chapitre || "Tous");
          setDistrictFilter(scope.district || "Tous");
        } else if (!cancelled) {
          setOrgScope(orgScopeFromProfile(role, {}));
        }
      } else if (!cancelled) {
        setOrgScope(DEMO_ORG_SCOPE[role]);
        setChapitreFilter(DEMO_ORG_SCOPE[role].chapitre || "Tous");
        setDistrictFilter(DEMO_ORG_SCOPE[role].district || "Tous");
      }
    }
    void loadScope();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, orgTree.chapitres.length]);

  useEffect(() => {
    if (!memberToast) return;
    const timer = window.setTimeout(() => setMemberToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [memberToast]);

  useEffect(() => {
    let cancelled = false;
    async function loadMemberQuotas() {
      const { data: campaigns } = await listSpecialCampaigns();
      const active = (campaigns || []).filter((c) => c.is_active);
      const totals: Record<string, number> = {};
      for (const campaign of active) {
        const { data: assignments } = await listQuotaAssignments(campaign.id);
        for (const row of assignments || []) {
          if (row.level !== "membre" || !row.member_id) continue;
          totals[row.member_id] = (totals[row.member_id] || 0) + Number(row.assigne || 0);
        }
      }
      if (!cancelled) setMemberZsAssigneById(totals);
    }
    void loadMemberQuotas();
    return () => {
      cancelled = true;
    };
  }, [members]);

  const filtered = useMemo(() => scopedMembers.filter((m) => {
    if (chapitreFilter !== "Tous" && m.chapitre !== chapitreFilter) return false;
    if (districtFilter !== "Tous" && m.district !== districtFilter) return false;
    if (statutFilter !== "Tous" && m.statut !== statutFilter) return false;
    const roleLabel = m.responsabilite === "Membre" ? "Membre simple" : m.responsabilite;
    if (responsabiliteFilter !== "Tous" && roleLabel !== responsabiliteFilter) return false;
    if (search && !`${m.prenom} ${m.nom}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [chapitreFilter, districtFilter, statutFilter, responsabiliteFilter, search, scopedMembers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / MEMBERS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * MEMBERS_PAGE_SIZE;
    return filtered.slice(start, start + MEMBERS_PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [chapitreFilter, districtFilter, statutFilter, responsabiliteFilter, search, orgScope.label]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleDeleteMember = async (m: MemberRecord) => {
    if (!canDeleteMember(role, m)) return;
    const ok = await confirm({
      title: "Supprimer définitivement ?",
      description: `${m.prenom} ${m.nom}\nCette action est irréversible. Utile pour corriger une erreur de saisie ou retirer un membre qui n’existe plus.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    if (hasRemoteMembers() && m.remoteId) {
      const { error } = await deleteMemberRemote(m.remoteId);
      if (error) {
        setMemberToast(error.message);
        return;
      }
    }
    setMembers((prev) => prev.filter((member) => member.id !== m.id));
    if (selected?.id === m.id) setSelected(null);
    setMemberToast(`${m.prenom} ${m.nom} a été supprimé.`);
    void reloadMembers();
  };

  const handlePromoteMember = async () => {
    if (!promoteTarget) return;
    if (!canChangeMemberResponsabilite(role, promoteTarget.responsabilite)) {
      setPromoteError("Impossible de modifier la responsabilité d’un responsable hiérarchique.");
      return;
    }
    setPromoteBusy(true);
    setPromoteError(null);
    setPromoteInfo(null);
    try {
      const fullName = `${promoteTarget.prenom} ${promoteTarget.nom}`.trim();

      if (hasRemoteProfiles()) {
        // Toujours résoudre le rattachement complet du membre (chapitre / district / groupe).
        const { data: orgIds, error: orgError } = await resolveOrgIds({
          chapitre: promoteTarget.chapitre,
          district: promoteTarget.district,
          groupe: promoteTarget.groupe,
        });
        if (orgError) throw orgError;
        if (promoteRole !== "admin" && promoteRole !== "centre") {
          if (!orgIds.chapitre_id || !orgIds.district_id || !orgIds.groupe_id) {
            throw new Error(
              "Chapitre, district et groupe du membre sont requis pour créer le compte responsable.",
            );
          }
        }
        const { data, error } = await inviteUserRemote({
          email: promoteTarget.email,
          full_name: fullName,
          role: promoteRole,
          status: "actif",
          skip_email_confirm: true,
          telephone: promoteTarget.telephone,
          department: promoteTarget.groupe || promoteTarget.district || promoteTarget.chapitre,
          chapitre_id: orgIds.chapitre_id,
          district_id: orgIds.district_id,
          groupe_id: orgIds.groupe_id,
          member_id: promoteTarget.remoteId || null,
        });
        if (error || !data) throw error || new Error("Promotion impossible.");
        const pwd = data.temporaryPassword
          ? ` Mot de passe temporaire : ${data.temporaryPassword}`
          : "";
        setPromoteInfo((data.message || "Responsable promu.") + pwd);
      } else {
        setPromoteInfo("Responsabilité mise à jour.");
      }

      setMembers((prev) =>
        prev.map((member) =>
          member.id === promoteTarget.id
            ? { ...member, responsabilite: platformRoleToResponsabilite(promoteRole) }
            : member,
        ),
      );
      setPromoteTarget((current) =>
        current
          ? { ...current, responsabilite: platformRoleToResponsabilite(promoteRole) }
          : current,
      );
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : "Échec de la promotion.");
    } finally {
      setPromoteBusy(false);
    }
  };

  const currentTab = MEMBRES_TABS.find((t) => t.key === activeTab) ?? MEMBRES_TABS[0];

  return (
    <div className="dash-page gap-5 sm:gap-6">
      {selected && (
        <MembreDetail
          membre={selected}
          canEdit={canEditMember(role, selected)}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditingMember(selected);
            setSelected(null);
          }}
        />
      )}

      {editingMember && (
        <PersonCreateForm
          mode="member"
          actorRole={role}
          variant="modal"
          open
          editMember={editingMember}
          existingMembers={members}
          onCancel={() => setEditingMember(null)}
          onSuccess={({ member, message }) => {
            setMembers((prev) => prev.map((item) => (item.id === member.id ? member : item)));
            setEditingMember(null);
            setMemberToast(message);
            void reloadMembers();
          }}
        />
      )}

      {promoteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/40 p-4 sm:items-center"
          onClick={() => !promoteBusy && setPromoteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-lift)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield size={16} className="text-[var(--sgi-blue)]" />
              Promouvoir en responsable
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {promoteTarget.prenom} {promoteTarget.nom} · {promoteTarget.email}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Attribue à ce membre un accès à la plateforme avec le rôle choisi. Un mot de passe temporaire sera généré pour sa première connexion.
            </p>
            <label className="mt-4 block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Rôle plateforme</span>
              <select
                value={promoteRole}
                onChange={(e) => setPromoteRole(e.target.value as PlatformRole)}
                className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none"
              >
                {assignableRoles(role).map((item) => (
                  <option key={item} value={item}>{ROLE_LABELS[item]}</option>
                ))}
              </select>
            </label>
            {promoteError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {promoteError}
              </div>
            )}
            {promoteInfo && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {promoteInfo}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={promoteBusy}
                onClick={() => setPromoteTarget(null)}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={promoteBusy}
                onClick={() => void handlePromoteMember()}
                className="rounded-xl bg-[var(--sgi-blue)] px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
              >
                {promoteBusy ? "Promotion…" : "Promouvoir"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {activeTab === "import-export" && (
        <MembersImportExportBar
          members={members}
          filteredMembers={filtered}
          collectes={collectes}
          role={role}
          orgScope={orgScope}
          onImport={(imported) => {
            setMembers((prev) => [...imported, ...prev]);
            void reloadMembers();
          }}
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
        <div className="w-full min-w-0 sm:w-auto sm:min-w-[9rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Chapitre</label>
          <select
            value={chapitreFilter}
            disabled={Boolean(orgScope.chapitre)}
            onChange={(e) => {
              const nextChapitre = e.target.value;
              setChapitreFilter(nextChapitre);
              if (nextChapitre !== "Tous" && districtFilter !== "Tous") {
                const chapitre = orgTree.chapitres.find((item) => item.name === nextChapitre);
                const allowed = chapitre
                  ? orgTree.districtsForChapitreId(chapitre.id).map((item) => item.name)
                  : [];
                if (!allowed.includes(districtFilter)) setDistrictFilter("Tous");
              }
            }}
            className="dash-field disabled:cursor-not-allowed disabled:opacity-70"
          >
            {chapitreFilterOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="w-full min-w-0 sm:w-auto sm:min-w-[9rem]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">District</label>
          <select
            value={districtFilter}
            disabled={Boolean(orgScope.district)}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="dash-field disabled:cursor-not-allowed disabled:opacity-70"
          >
            {districtFilterOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        {[
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

      {memberToast && (
        <div className="rounded-xl border border-[var(--sgi-blue)]/20 bg-[var(--sgi-blue)]/5 px-4 py-3 text-sm text-foreground">
          {memberToast}
        </div>
      )}
      {membersError && (
        <div className="rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/5 px-4 py-3 text-sm text-[var(--sgi-red)]">
          {membersError}
          <button
            type="button"
            onClick={() => void reloadMembers()}
            className="ml-3 underline underline-offset-2"
          >
            Réessayer
          </button>
        </div>
      )}

      {showForm && (
        <PersonCreateForm
          mode="member"
          actorRole={role}
          variant="inline"
          existingMembers={members}
          initialOrg={{
            chapitre: orgScope.chapitre || orgTree.chapitres[0]?.name || "",
            district:
              orgScope.district ||
              (orgScope.chapitre
                ? orgTree.districts.find((d) => {
                    const chap = orgTree.chapitres.find((c) => c.name === orgScope.chapitre);
                    return chap && d.chapitre_id === chap.id;
                  })?.name
                : orgTree.districts[0]?.name) ||
              "",
            groupe: orgScope.groupe || orgTree.groupes[0]?.name || "",
          }}
          onCancel={() => setShowForm(false)}
          onSuccess={({ member, message }) => {
            setMembers((prev) => [member, ...prev]);
            setShowForm(false);
            setMemberToast(message);
            void reloadMembers();
          }}
        />
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">
            {membersLoading
              ? "Chargement des membres…"
              : `${filtered.length} membre${filtered.length !== 1 ? "s" : ""}`}
            {!membersLoading && filtered.length > 0 && (
              <span className="ml-2 font-normal text-muted-foreground">
                · {Math.min((currentPage - 1) * MEMBERS_PAGE_SIZE + 1, filtered.length)}–
                {Math.min(currentPage * MEMBERS_PAGE_SIZE, filtered.length)} sur {filtered.length}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setActiveTab("import-export")}
            className="text-xs font-medium text-[var(--sgi-blue)] hover:underline"
          >
            Import / Export →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-[12px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {[
                  "Membre",
                  "Rôle",
                  "Chapitre",
                  "District",
                  "Statut",
                  "Z. ord.",
                  "Z. sp. payé/cota",
                  "VP",
                  "Sokahan",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${
                      h === "Actions"
                        ? "sticky right-0 z-20 bg-muted/95 shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.25)]"
                        : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {membersLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Chargement de la liste des membres…
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {members.length === 0
                      ? "Aucun membre enregistré pour le moment."
                      : "Aucun membre ne correspond aux filtres."}
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m, i) => {
                const zoPaye = getMemberZaimuPaid(collectes, m, "zaimu-ordinaire");
                const zsPaye = getMemberZaimuPaid(collectes, m, "zaimu-special");
                const zsAssigne = m.remoteId ? memberZsAssigneById[m.remoteId] || 0 : 0;
                const zsReste = Math.max(0, zsAssigne - zsPaye);
                return (
                <tr key={m.id} className={`group border-b border-border transition-colors hover:bg-muted/30 ${i === paginatedMembers.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-2.5 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <MemberAvatar photo={m.photo} prenom={m.prenom} nom={m.nom} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">
                          {m.prenom} {m.nom}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2.5 py-2">
                    <span
                      className={`inline-flex max-w-[7.5rem] truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        (m.responsabilite === "Membre" || m.responsabilite === "Membre simple")
                          ? "bg-muted text-muted-foreground"
                          : "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]"
                      }`}
                      title={m.responsabilite === "Membre" ? "Membre simple" : m.responsabilite}
                    >
                      {m.responsabilite === "Membre" ? "Membre simple" : m.responsabilite}
                    </span>
                  </td>
                  <td className="max-w-[7rem] truncate px-2.5 py-2 text-[11px] text-muted-foreground" title={m.chapitre}>
                    {m.chapitre.includes("–") ? m.chapitre.split("–")[1]?.trim() : m.chapitre}
                  </td>
                  <td className="max-w-[6.5rem] truncate px-2.5 py-2 text-[11px] text-muted-foreground" title={m.district}>
                    {m.district}
                  </td>
                  <td className="px-2.5 py-2"><StatutBadge statut={m.statut} /></td>
                  <td className="whitespace-nowrap px-2.5 py-2 font-mono text-[11px] text-foreground">{formatFcfa(zoPaye)}</td>
                  <td className="px-2.5 py-2">
                    <div className="whitespace-nowrap font-mono text-[11px] text-foreground">{formatFcfa(zsPaye)} / {formatFcfa(zsAssigne)}</div>
                    <div className="text-[9px] text-muted-foreground">Reste {formatFcfa(zsReste)}</div>
                  </td>
                  <td className="px-2.5 py-2">
                    {m.abonnementVaguePaix
                      ? <CheckCircle size={14} className="text-emerald-500" />
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2.5 py-2">
                    {m.sokahan
                      ? <CheckCircle size={14} className="text-emerald-500" />
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="sticky right-0 z-10 bg-card px-2.5 py-2 shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.18)] group-hover:bg-muted/30">
                    <div className="flex items-center justify-end gap-1.5">
                      {canDeleteMember(role, m) && (
                        <button
                          type="button"
                          title="Supprimer le membre"
                          aria-label={`Supprimer ${m.prenom} ${m.nom}`}
                          onClick={() => void handleDeleteMember(m)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 text-[var(--sgi-red)] transition hover:bg-[var(--sgi-red)]/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <RowActionsMenu
                      actions={[
                        {
                          label: "Voir le détail",
                          icon: <Eye size={14} />,
                          onClick: () => setSelected(m),
                        },
                        ...(canEditMember(role, m)
                          ? [{
                              label: "Modifier",
                              icon: <Edit2 size={14} />,
                              onClick: () => setEditingMember(m),
                            }]
                          : []),
                        ...(canPromote && canChangeMemberResponsabilite(role, m.responsabilite)
                          ? [{
                              label: "Promouvoir responsable",
                              icon: <Shield size={14} />,
                              onClick: () => {
                                const roles = assignableRoles(role);
                                const suggested = suggestedPlatformRole(m.responsabilite);
                                setPromoteTarget(m);
                                setPromoteRole(roles.includes(suggested) ? suggested : roles[0] || "groupe");
                                setPromoteError(null);
                                setPromoteInfo(null);
                              },
                            }]
                          : []),
                        ...(canDeactivateMember(role, m.responsabilite)
                          ? [{
                              label: "Désactiver",
                              icon: <UserX size={14} />,
                              tone: "danger" as const,
                              onClick: () => {
                                void (async () => {
                                  const ok = await confirm({
                                    title: "Désactiver ce membre ?",
                                    description: `${m.prenom} ${m.nom} passera au statut Suspendu.`,
                                    confirmLabel: "Désactiver",
                                    tone: "danger",
                                  });
                                  if (!ok) return;
                                  if (hasRemoteMembers() && m.remoteId && m.source !== "profile") {
                                    const { error } = await setMemberStatusRemote(m.remoteId, "Suspendu");
                                    if (error) {
                                      setMemberToast(error.message);
                                      return;
                                    }
                                  }
                                  setMembers((prev) =>
                                    prev.map((member) =>
                                      member.id === m.id ? { ...member, statut: "Suspendu" } : member,
                                    ),
                                  );
                                  setMemberToast(`${m.prenom} ${m.nom} a été désactivé.`);
                                  void reloadMembers();
                                })();
                              },
                            }]
                          : []),
                        ...(canDeleteMember(role, m)
                          ? [{
                              label: "Supprimer",
                              icon: <Trash2 size={14} />,
                              tone: "danger" as const,
                              onClick: () => void handleDeleteMember(m),
                            }]
                          : []),
                      ]}
                    />
                    </div>
                  </td>
                </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > MEMBERS_PAGE_SIZE && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Précédent
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                    pageNumber === currentPage
                      ? "bg-[var(--sgi-blue)] text-white"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}

// ─── Directives Module ────────────────────────────────────────────────────────

function Directives() {
  const orgTree = useOrgTree();
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
                {[
                  "Tous les chapitres",
                  ...orgTree.chapitres.map((item) => item.name),
                  ...orgTree.districts.map((item) => item.name),
                ].map((a) => (
                  <option key={a}>{a}</option>
                ))}
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

function Statistiques({ role }: { role: PlatformRole }) {
  const orgTree = useOrgTree();
  const { members, collectes, loading } = useOpsData();
  const [orgScope, setOrgScope] = useState<OrgScope>(() => DEMO_ORG_SCOPE[role]);
  const [axe, setAxe] = useState<"membres" | "cotisations" | "zaimu-ordinaire" | "zaimu-special">(
    "membres",
  );
  const [fromDate, setFromDate] = useState(() => format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    let cancelled = false;
    async function loadScope() {
      if (hasRemoteProfiles()) {
        const { data } = await fetchMyProfile();
        if (!cancelled && data) {
          let chapitre = data.chapitre_name || "";
          let district = data.district_name || "";
          let groupe = data.groupe_name || "";
          if ((!chapitre || !district || !groupe) && (data.chapitre_id || data.district_id || data.groupe_id)) {
            const names = orgTree.nameOf({
              chapitreId: data.chapitre_id || "",
              districtId: data.district_id || "",
              groupeId: data.groupe_id || "",
            });
            chapitre = chapitre || names.chapitre;
            district = district || names.district;
            groupe = groupe || names.groupe;
          }
          setOrgScope(orgScopeFromProfile(role, { chapitre, district, groupe }));
        } else if (!cancelled) {
          setOrgScope(orgScopeFromProfile(role, {}));
        }
      } else if (!cancelled) {
        setOrgScope(DEMO_ORG_SCOPE[role]);
      }
    }
    void loadScope();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, orgTree.chapitres.length]);

  const axeLabel: Record<string, string> = {
    membres: "Membres",
    cotisations: "Vague de Paix (FCFA)",
    "zaimu-ordinaire": "Zaimu ordinaire (FCFA)",
    "zaimu-special": "Zaimu spécial (FCFA)",
  };
  const breakdownUnit = statsBreakdownUnitForRole(role);
  const breakdownLabel = statsBreakdownLabel(breakdownUnit);

  const scopedMembers = useMemo(
    () => filterMembersByScope(members, orgScope),
    [members, orgScope],
  );
  const scopedCollectes = useMemo(
    () => filterCollectesByScope(collectes, orgScope),
    [collectes, orgScope],
  );

  const periodCollectes = useMemo(
    () =>
      scopedCollectes.filter((c) => {
        if (c.statut !== "Validé") return false;
        const date = parseISO(c.date);
        return date >= parseISO(fromDate) && date <= parseISO(toDate);
      }),
    [scopedCollectes, fromDate, toDate],
  );

  const filteredTransactions = useMemo(
    () =>
      periodCollectes.map((c, index) => ({
        id: c.id || `tx-${index}`,
        date: c.date,
        membre: c.membre || "—",
        type:
          c.type === "vague-paix"
            ? "Vague de Paix"
            : c.type === "zaimu-ordinaire"
              ? "Zaimu ordinaire"
              : "Zaimu spécial",
        montant: c.montant,
        statut: c.statut,
        chapitre: c.chapitre,
        district: c.district,
        groupe: c.groupe,
      })),
    [periodCollectes],
  );

  const totalCotisations = periodCollectes
    .filter((c) => c.type === "vague-paix")
    .reduce((sum, c) => sum + c.montant, 0);
  const totalZaimuOrdinaire = periodCollectes
    .filter((c) => c.type === "zaimu-ordinaire")
    .reduce((sum, c) => sum + c.montant, 0);
  const totalZaimuSpecial = periodCollectes
    .filter((c) => c.type === "zaimu-special")
    .reduce((sum, c) => sum + c.montant, 0);
  const totalTransactions = periodCollectes.length;
  const uniqueMembers = new Set(periodCollectes.map((c) => c.membre || "").filter(Boolean)).size;
  const totalAbonnements = scopedMembers.filter((m) => m.abonnementVaguePaix).length;

  const breakdownRows = useMemo(
    () => buildStatsBreakdown(scopedMembers, periodCollectes, breakdownUnit),
    [scopedMembers, periodCollectes, breakdownUnit],
  );

  const trendData = useMemo(() => {
    const months: Array<{
      mois: string;
      montant: number;
      zaimuOrdinaire: number;
      zaimuSpecial: number;
      membres: number;
      abonnements: number;
    }> = [];
    const start = parseISO(fromDate);
    const end = parseISO(toDate);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const key = format(cursor, "yyyy-MM");
      const label = format(cursor, "MMM yyyy");
      const ofMonth = periodCollectes.filter((c) => c.date.startsWith(key));
      months.push({
        mois: label,
        montant: ofMonth.filter((c) => c.type === "vague-paix").reduce((s, c) => s + c.montant, 0),
        zaimuOrdinaire: ofMonth
          .filter((c) => c.type === "zaimu-ordinaire")
          .reduce((s, c) => s + c.montant, 0),
        zaimuSpecial: ofMonth
          .filter((c) => c.type === "zaimu-special")
          .reduce((s, c) => s + c.montant, 0),
        membres: scopedMembers.filter((m) => !m.adhesion || m.adhesion <= `${key}-31`).length,
        abonnements: scopedMembers.filter((m) => m.abonnementVaguePaix).length,
      });
      cursor.setMonth(cursor.getMonth() + 1);
      if (months.length > 18) break;
    }
    return months;
  }, [periodCollectes, fromDate, toDate, scopedMembers]);

  const barData = breakdownRows.map((row) => ({
    name: row.label.replace("\n", " "),
    Membres: row.membres,
    Cotisations: row.cotisations,
    "Zaimu ordinaire": row.zaimuOrdinaire,
    "Zaimu spécial": row.zaimuSpecial,
  }));

  const consolidationHint =
    role === "groupe"
      ? "Bilan consolide du groupe"
      : role === "district"
        ? "Bilan consolide des groupes du district"
        : role === "chapitre"
          ? "Bilan consolide des districts du chapitre"
          : "Point consolide du Centre";

  const scopeSlug = (orgScope.groupe || orgScope.district || orgScope.chapitre || role)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_|_$/g, "");

  const exportStatsPdf = () => {
    const kpis = computeMemberListKpis(scopedMembers, scopedCollectes, {
      from: fromDate,
      to: toDate,
    });

    exportStatisticsPdf({
      roleLabel: ROLE_LABELS[role],
      consolidationHint,
      reportTitle:
        role === "admin" || role === "centre"
          ? "Bilan consolide du Centre"
          : `Bilan consolide - ${orgScope.label}`,
      scopeLabel: orgScope.label,
      fromDateLabel: format(parseISO(fromDate), "dd/MM/yyyy"),
      toDateLabel: format(parseISO(toDate), "dd/MM/yyyy"),
      filename: `bilan_consolide_${scopeSlug}_${fromDate}_${toDate}.pdf`,
      kpis,
      summary: {
        totalTransactions,
        uniqueMembers,
        totalCotisations,
        totalZaimuOrdinaire,
        totalZaimuSpecial,
        totalAbonnements,
      },
    });
  };

  const exportStatsExcel = () => {
    const summaryData = [
      { Clé: "Périmètre", Valeur: orgScope.label },
      { Clé: "Rôle", Valeur: ROLE_LABELS[role] },
      { Clé: "Période", Valeur: `${format(parseISO(fromDate), "dd/MM/yyyy")} - ${format(parseISO(toDate), "dd/MM/yyyy")}` },
      { Clé: "Total de transactions", Valeur: totalTransactions },
      { Clé: "Membres contributeurs", Valeur: uniqueMembers },
      { Clé: "Vague de Paix (FCFA)", Valeur: totalCotisations },
      { Clé: "Zaimu ordinaire (FCFA)", Valeur: totalZaimuOrdinaire },
      { Clé: "Zaimu spécial (FCFA)", Valeur: totalZaimuSpecial },
      { Clé: "Abonnements Vague de Paix", Valeur: totalAbonnements },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const breakdownSheet = XLSX.utils.json_to_sheet(
      breakdownRows.map((row) => ({
        [breakdownLabel]: row.label.replace("\n", " "),
        Membres: row.membres,
        "Zaimu ordinaire": row.zaimuOrdinaire,
        "Zaimu spécial": row.zaimuSpecial,
        "Abonnements VP": row.abonnementsVp,
      })),
    );
    const transactionsSheet = XLSX.utils.json_to_sheet(
      filteredTransactions.map((t) => ({
        Date: t.date,
        Membre: t.membre,
        Type: t.type,
        Montant: t.montant,
        Chapitre: t.chapitre,
        District: t.district,
        Groupe: t.groupe,
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Résumé");
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, `Par ${breakdownLabel}`);
    XLSX.utils.book_append_sheet(workbook, transactionsSheet, "Transactions");

    XLSX.writeFile(workbook, `statistiques_${scopeSlug}_${fromDate}_${toDate}.xlsx`);
  };

  return (
    <div className="dash-page gap-5 sm:gap-6">
      {loading && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Synchronisation des statistiques depuis Membres et Collectes…
        </div>
      )}

      <MembersKpiPanel
        role={role}
        members={members}
        collectes={collectes}
        orgScope={orgScope}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onExportPdf={exportStatsPdf}
        onExportExcel={exportStatsExcel}
      />

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Analyse croisée par {breakdownLabel.toLowerCase()}
            </div>
            <div className="text-xs text-muted-foreground">
              Comparaison multi-indicateurs
            </div>
          </div>
          <div className="flex gap-1.5">
            {(
              ["membres", "cotisations", "zaimu-ordinaire", "zaimu-special"] as const
            ).map((k) => (
              <button key={k} onClick={() => setAxe(k)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${axe === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary"}`}>
                {axeLabel[k]}
              </button>
            ))}
          </div>
        </div>
        {barData.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
            —
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false}
                tickFormatter={axe === "membres" ? undefined : (v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [axe === "membres" ? v : `${fmt(v)} FCFA`]} />
              <Bar
                dataKey={
                  axe === "membres"
                    ? "Membres"
                    : axe === "cotisations"
                      ? "Cotisations"
                      : axe === "zaimu-ordinaire"
                        ? "Zaimu ordinaire"
                        : "Zaimu spécial"
                }
                fill={axe === "zaimu-special" ? "#C23A2B" : axe === "zaimu-ordinaire" ? "#C4920E" : "#1A3470"}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trend area charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="text-sm font-semibold text-foreground mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
            Vague de Paix, Zaimu ordinaire & spécial
          </div>
          <div className="text-xs text-muted-foreground mb-4">Évolution sur la période (FCFA)</div>
          {trendData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
              —
            </div>
          ) : (
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
                  <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C23A2B" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#C23A2B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6478A0" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, name: string) => [`${fmt(v)} FCFA`, name]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="montant" name="Vague de Paix" stroke="#1A3470" fill="url(#gradBlue)" strokeWidth={2} dot={{ r: 2.5, fill: "#1A3470" }} />
                <Area type="monotone" dataKey="zaimuOrdinaire" name="Zaimu ordinaire" stroke="#C4920E" fill="url(#gradGold)" strokeWidth={2} dot={{ r: 2.5, fill: "#C4920E" }} />
                <Area type="monotone" dataKey="zaimuSpecial" name="Zaimu spécial" stroke="#C23A2B" fill="url(#gradRed)" strokeWidth={2} dot={{ r: 2.5, fill: "#C23A2B" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="text-sm font-semibold text-foreground mb-0.5" style={{ fontFamily: "var(--font-display)" }}>Membres vs Abonnements Vague de Paix</div>
          <div className="text-xs text-muted-foreground mb-4">Évolution sur 6 mois</div>
          {trendData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
              —
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="mb-1 text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
          Tableau de synthèse par {breakdownLabel.toLowerCase()}
        </div>
        <div className="mb-4 text-xs text-muted-foreground">
          Les totaux de ce périmètre alimentent le cumul supérieur jusqu’au Centre.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  breakdownLabel,
                  "Membres",
                  "Zaimu ordinaire",
                  "Zaimu spécial",
                  "Abonnements VP",
                  "Ratio VP",
                ].map((h) => (
                  <th key={h} className="text-left pb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breakdownRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-10 text-center text-sm text-muted-foreground">
                    —
                  </td>
                </tr>
              ) : (
                breakdownRows.map((row, i) => {
                  const ratio = row.membres > 0 ? Math.round((row.abonnementsVp / row.membres) * 100) : 0;
                  return (
                    <tr key={row.key} className={`border-b border-border hover:bg-muted/20 transition-colors ${i === breakdownRows.length - 1 ? "border-b-0" : ""}`}>
                      <td className="py-3 font-medium text-foreground pr-4">{row.label.replace("\n", " ")}</td>
                      <td className="py-3 text-foreground pr-4" style={{ fontFamily: "var(--font-mono)" }}>{row.membres}</td>
                      <td className="py-3 text-foreground pr-4" style={{ fontFamily: "var(--font-mono)" }}>{fmt(row.zaimuOrdinaire)}</td>
                      <td className="py-3 text-foreground pr-4" style={{ fontFamily: "var(--font-mono)" }}>{fmt(row.zaimuSpecial)}</td>
                      <td className="py-3 text-foreground pr-4" style={{ fontFamily: "var(--font-mono)" }}>{row.abonnementsVp}</td>
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
                })
              )}
            </tbody>
            {breakdownRows.length > 1 && (
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td className="py-3 font-semibold text-foreground pr-4">Total périmètre</td>
                  <td className="py-3 font-semibold pr-4" style={{ fontFamily: "var(--font-mono)" }}>
                    {breakdownRows.reduce((s, r) => s + r.membres, 0)}
                  </td>
                  <td className="py-3 font-semibold pr-4" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmt(breakdownRows.reduce((s, r) => s + r.zaimuOrdinaire, 0))}
                  </td>
                  <td className="py-3 font-semibold pr-4" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmt(breakdownRows.reduce((s, r) => s + r.zaimuSpecial, 0))}
                  </td>
                  <td className="py-3 font-semibold pr-4" style={{ fontFamily: "var(--font-mono)" }}>
                    {breakdownRows.reduce((s, r) => s + r.abonnementsVp, 0)}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">Cumul</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

const MODULE_TITLES: Record<string, string> = {
  dashboard: "Tableau de bord — Vue générale",
  contenu: "Gestion du contenu — Landing page",
  membres: "Gestion des membres",
  collectes: "Collectes — Vague de Paix & Zaimu",
  directives: "Directives & Communications",
  statistiques: "Statistiques & Analyses",
  chapitres: "Organisation — Chapitres",
  districts: "Organisation — Districts",
  groupes: "Organisation — Groupes",
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
  const [collectesFocus, setCollectesFocus] = useState<CollecteNavFocus | null>(null);
  const [moduleAccess, setModuleAccess] = useState(() => loadModuleAccess());
  const orgTree = useOrgTree();
  const [sessionProfile, setSessionProfile] = useState<SessionProfile>({
    name: "",
    photo: "",
    orgScope: DEMO_ORG_SCOPE.centre,
  });

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

  useEffect(() => {
    let cancelled = false;
    async function loadSessionProfile() {
      if (!currentUserRole) return;
      if (!hasRemoteProfiles()) {
        if (!cancelled) {
          setSessionProfile({
            name: "",
            photo: "",
            orgScope: DEMO_ORG_SCOPE[currentUserRole],
          });
        }
        return;
      }
      const { data } = await fetchMyProfile();
      if (cancelled) return;
      if (!data) {
        setSessionProfile({
          name: "",
          photo: "",
          orgScope: orgScopeFromProfile(currentUserRole, {}),
        });
        return;
      }
      let chapitre = data.chapitre_name || "";
      let district = data.district_name || "";
      let groupe = data.groupe_name || "";
      if ((!chapitre || !district || !groupe) && (data.chapitre_id || data.district_id || data.groupe_id)) {
        const names = orgTree.nameOf({
          chapitreId: data.chapitre_id || "",
          districtId: data.district_id || "",
          groupeId: data.groupe_id || "",
        });
        chapitre = chapitre || names.chapitre;
        district = district || names.district;
        groupe = groupe || names.groupe;
      }
      setSessionProfile({
        name: data.full_name || data.email || "",
        photo: data.photo_url || "",
        orgScope: orgScopeFromProfile(currentUserRole, { chapitre, district, groupe }),
      });
    }
    void loadSessionProfile();
    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Partial<SessionProfile>>).detail;
      if (!detail) {
        void loadSessionProfile();
        return;
      }
      setSessionProfile((prev) => ({
        name: detail.name ?? prev.name,
        photo: detail.photo ?? prev.photo,
        orgScope: detail.orgScope ?? prev.orgScope,
      }));
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserRole, orgTree.chapitres.length]);

  useEffect(() => {
    const onRbacChanged = () => setModuleAccess(loadModuleAccess());
    window.addEventListener(RBAC_CHANGED_EVENT, onRbacChanged);
    window.addEventListener("storage", onRbacChanged);
    return () => {
      window.removeEventListener(RBAC_CHANGED_EVENT, onRbacChanged);
      window.removeEventListener("storage", onRbacChanged);
    };
  }, []);

  const allowedModules = useMemo(
    () => (currentUserRole ? moduleAccess[currentUserRole] ?? [] : []),
    [currentUserRole, moduleAccess],
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
    if (
      currentUserRole !== "admin" &&
      currentUserRole !== "centre" &&
      currentUserRole !== "chapitre"
    ) {
      return;
    }
    switchModule("settings");
    setProfileMenuOpen(false);
    setSidebarOpen(false);
  };

  const handleOpenContent = () => {
    switchModule("contenu");
    setProfileMenuOpen(false);
    setSidebarOpen(false);
  };

  const handleOpenCollectes = (focus?: CollecteNavFocus) => {
    if (focus) {
      setCollectesFocus({ ...focus, nonce: focus.nonce ?? Date.now() });
    }
    switchModule("collectes");
    setProfileMenuOpen(false);
    setSidebarOpen(false);
  };

  const handleNavigate = (module: ModuleKey) => {
    switchModule(module);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    void signOut();
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
    <OpsDataProvider>
    <div className="flex h-screen overflow-hidden bg-background" style={{ fontFamily: "var(--font-sans)" }}>
      <Sidebar
        active={activeModule}
        setActive={switchModule}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        allowedModules={allowedModules}
        role={currentUserRole}
        sessionProfile={sessionProfile}
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
              sessionProfile={sessionProfile}
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
          sessionProfile={sessionProfile}
          onOpenProfile={handleOpenProfile}
          onOpenSettings={handleOpenSettings}
          onOpenContent={handleOpenContent}
          onOpenCollectes={handleOpenCollectes}
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
          {activeModule === "dashboard" && (
            <Dashboard role={currentUserRole} orgScope={sessionProfile.orgScope} />
          )}
          {activeModule === "contenu" && (currentUserRole === "admin" || currentUserRole === "centre") && (
            <AdminEditLanding />
          )}
          {activeModule === "membres" && <Membres role={currentUserRole} />}
          {activeModule === "collectes" && (
            <CollectesModule
              role={currentUserRole}
              focus={collectesFocus}
              onFocusApplied={() => setCollectesFocus(null)}
            />
          )}
          {activeModule === "directives" && <Directives />}
          {activeModule === "statistiques" && <Statistiques role={currentUserRole} />}
          {activeModule === "chapitres" && (currentUserRole === "admin" || currentUserRole === "centre") && (
            <ChapitresModule />
          )}
          {activeModule === "districts" && (currentUserRole === "admin" || currentUserRole === "centre") && (
            <DistrictsModule />
          )}
          {activeModule === "groupes" && (currentUserRole === "admin" || currentUserRole === "centre") && (
            <GroupesModule />
          )}
          {activeModule === "profil" && <ProfilePage role={currentUserRole} />}
          {activeModule === "settings" &&
            (currentUserRole === "admin" ||
              currentUserRole === "centre" ||
              currentUserRole === "chapitre" ||
              currentUserRole === "district") && (
              <SettingsModule currentUserRole={currentUserRole} />
            )}
          <footer className="border-t border-border px-4 py-3 sm:px-6">
            <DeveloperCredit variant="muted" className="text-center sm:text-left" />
          </footer>
        </main>
      </div>

      <DashboardAiAssistant role={currentUserRole} />
    </div>
    </OpsDataProvider>
  );
}
