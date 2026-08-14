import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Search,
  Shield,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import { ALLOWED_ROLES, ROLE_LABELS, type PlatformRole } from "../roles";
import type { ProfileStatus, UserProfile } from "../profilesData";
import { purgeMockAccountStorage } from "../profilesData";
import { MemberAvatar } from "../MemberAvatar";
import PersonCreateForm from "../PersonCreateForm";
import FilterPanel from "../FilterPanel";
import {
  canDeleteUser,
  canManageOrgScope,
  canManageUserAccount,
  orgFieldsForRole,
} from "../orgAccess";
import { useOrgTree, type OrgSelectionIds } from "../useOrgTree";
import {
  accessToMatrix,
  loadModuleAccess,
  matrixToAccess,
  resetModuleAccess,
  saveModuleAccess,
  type RbacMatrixRow,
} from "./rbacStore";
import {
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
} from "./appSettingsStore";
import {
  assignableRoles,
  deleteManagedUser,
  loadManagedUsers,
  updateManagedUser,
  USERS_CHANGED_EVENT,
  type ManagedUser,
} from "./usersStore";
import {
  deleteUserRemote,
  fetchMyProfile,
  hasRemoteProfiles,
  listProfiles,
  updateProfileRemote,
} from "../../services/profileService";
import type { ProfileRow } from "../../types/supabase";

function stableNumericId(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) {
    hash = (hash * 31 + uuid.charCodeAt(i)) >>> 0;
  }
  return hash || Date.now();
}

type SettingsTab = "users" | "rbac" | "general";

const STATUS_OPTIONS: ProfileStatus[] = ["Actif", "En attente", "Suspendu"];

const STATUS_TO_DB: Record<ProfileStatus, "actif" | "en_attente" | "suspendu"> = {
  Actif: "actif",
  "En attente": "en_attente",
  Suspendu: "suspendu",
};

/** Les comptes admin restent invisibles pour tous les autres rôles. */
function usersVisibleToActor(users: ManagedUser[], actorRole: PlatformRole): ManagedUser[] {
  if (actorRole === "admin") return users;
  return users.filter((user) => user.role !== "admin");
}

const DB_TO_STATUS: Record<string, ProfileStatus> = {
  actif: "Actif",
  en_attente: "En attente",
  suspendu: "Suspendu",
};

function profileFromRemote(row: ProfileRow): ManagedUser {
  const scopeLabel =
    [row.chapitre_name, row.district_name, row.groupe_name].filter(Boolean).join(" · ") ||
    row.department ||
    "";
  return {
    id: stableNumericId(row.id),
    remoteId: row.id,
    name: row.full_name || row.email,
    email: row.email,
    role: row.role,
    status: DB_TO_STATUS[row.status] || "En attente",
    chapitre: row.chapitre_name || "",
    district: row.district_name || "",
    groupe: row.groupe_name || "",
    department: scopeLabel || row.department || "",
    telephone: row.telephone || "",
    quartier: row.quartier || "",
    bio: row.bio || "",
    photo: row.photo_url || "",
    chapitreId: row.chapitre_id,
    districtId: row.district_id,
    groupeId: row.groupe_id,
  };
}

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    Actif: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
    "En attente": "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]",
    Suspendu: "bg-[var(--sgi-red)]/12 text-[var(--sgi-red)]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[statut] || "bg-muted text-muted-foreground"}`}>
      {statut}
    </span>
  );
}

function RoleBadge({ role }: { role: PlatformRole }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sgi-blue)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--sgi-blue)]">
      <Shield size={11} />
      {ROLE_LABELS[role]}
    </span>
  );
}

export default function SettingsModule({ currentUserRole }: { currentUserRole: PlatformRole }) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("users");
  const [profiles, setProfiles] = useState<ManagedUser[]>([]);
  const [roleFilter, setRoleFilter] = useState<"all" | PlatformRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProfileStatus>("all");
  const [query, setQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<ManagedUser | null>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lastTempPassword, setLastTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rbacMatrix, setRbacMatrix] = useState<RbacMatrixRow[]>(() => accessToMatrix(loadModuleAccess()));
  const [rbacDirty, setRbacDirty] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings());
  const [remoteNotice, setRemoteNotice] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [actorOrg, setActorOrg] = useState<{
    chapitre: string;
    district: string;
    groupe: string;
  }>({ chapitre: "", district: "", groupe: "" });
  const orgTree = useOrgTree();
  const [orgDraft, setOrgDraft] = useState<OrgSelectionIds & { unassigned: boolean }>({
    chapitreId: "",
    districtId: "",
    groupeId: "",
    unassigned: false,
  });
  const [orgSaving, setOrgSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<ManagedUser | null>(null);

  const applyUsers = (users: ManagedUser[]) => {
    const visible = usersVisibleToActor(users, currentUserRole);
    setProfiles(visible);
    setSelectedProfile((current) => {
      if (!current) return visible[0] || null;
      return visible.find((user) => user.remoteId && user.remoteId === current.remoteId)
        || visible.find((user) => user.id === current.id)
        || visible[0]
        || null;
    });
  };

  const syncUsersFromDb = async () => {
    if (!hasRemoteProfiles()) {
      setRemoteNotice(null);
      applyUsers(loadManagedUsers());
      return;
    }
    setUsersLoading(true);
    try {
      const { data, error } = await listProfiles();
      if (error) {
        setRemoteNotice("Impossible de charger les utilisateurs.");
        applyUsers([]);
        return;
      }
      applyUsers(data.map(profileFromRemote));
      setRemoteNotice(null);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    purgeMockAccountStorage();
    const refreshLocal = () => {
      if (hasRemoteProfiles()) return;
      applyUsers(loadManagedUsers());
    };
    refreshLocal();
    window.addEventListener(USERS_CHANGED_EVENT, refreshLocal);
    return () => window.removeEventListener(USERS_CHANGED_EVENT, refreshLocal);
  }, [currentUserRole]);

  useEffect(() => {
    void syncUsersFromDb();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSelf() {
      if (!hasRemoteProfiles()) {
        if (!cancelled) {
          setCurrentUserId(null);
          setCurrentUserEmail(null);
          setActorOrg({ chapitre: "", district: "", groupe: "" });
        }
        return;
      }
      const { data } = await fetchMyProfile();
      if (cancelled || !data) return;
      setCurrentUserId(data.id);
      setCurrentUserEmail((data.email || "").toLowerCase());
      const names = orgTree.nameOf({
        chapitreId: data.chapitre_id || "",
        districtId: data.district_id || "",
        groupeId: data.groupe_id || "",
      });
      setActorOrg({
        chapitre: data.chapitre_name || names.chapitre || "",
        district: data.district_name || names.district || "",
        groupe: data.groupe_name || names.groupe || "",
      });
    }
    void loadSelf();
    return () => {
      cancelled = true;
    };
  }, [orgTree.loading, orgTree.chapitres.length, orgTree.nameOf]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const isSelfAccount = (user: ManagedUser | null) => {
    if (!user) return false;
    if (currentUserId && user.remoteId && user.remoteId === currentUserId) return true;
    if (currentUserEmail && user.email.toLowerCase() === currentUserEmail) return true;
    return false;
  };

  useEffect(() => {
    if (!selectedProfile) return;
    if (orgTree.loading || orgTree.chapitres.length === 0) return;
    const unassigned =
      (selectedProfile.role === "centre" || selectedProfile.role === "admin") &&
      !selectedProfile.chapitreId &&
      !selectedProfile.districtId &&
      !selectedProfile.groupeId;
    const next = orgTree.coerceSelection(
      selectedProfile.chapitreId || selectedProfile.districtId || selectedProfile.groupeId
        ? {
            chapitreId: selectedProfile.chapitreId || "",
            districtId: selectedProfile.districtId || "",
            groupeId: selectedProfile.groupeId || "",
          }
        : selectedProfile.chapitre || selectedProfile.district || selectedProfile.groupe
          ? orgTree.findByNames({
              chapitre: selectedProfile.chapitre,
              district: selectedProfile.district,
              groupe: selectedProfile.groupe,
            })
          : orgTree.defaultSelection,
    );
    setOrgDraft({
      ...next,
      unassigned,
    });
    // Sync only when the selected user / persisted org scope changes — not on every callback identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedProfile?.id,
    selectedProfile?.remoteId,
    selectedProfile?.role,
    selectedProfile?.chapitreId,
    selectedProfile?.districtId,
    selectedProfile?.groupeId,
    orgTree.loading,
    orgTree.chapitres.length,
  ]);

  const visibleProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      if (roleFilter !== "all" && profile.role !== roleFilter) return false;
      if (statusFilter !== "all" && profile.status !== statusFilter) return false;
      if (!q) return true;
      return (
        profile.name.toLowerCase().includes(q) ||
        profile.email.toLowerCase().includes(q) ||
        ROLE_LABELS[profile.role].toLowerCase().includes(q)
      );
    });
  }, [profiles, query, roleFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: profiles.length,
    actifs: profiles.filter((p) => p.status === "Actif").length,
    pending: profiles.filter((p) => p.status === "En attente").length,
    suspendus: profiles.filter((p) => p.status === "Suspendu").length,
  }), [profiles]);

  const updateProfile = async (
    id: number,
    patch: Partial<UserProfile> & {
      chapitre_id?: string | null;
      district_id?: string | null;
      groupe_id?: string | null;
    },
  ) => {
    const current = profiles.find((profile) => profile.id === id);
    if (!current) return;

    if (isSelfAccount(current) && (patch.role !== undefined || patch.status !== undefined)) {
      setToast("Vous ne pouvez pas modifier votre propre rôle ni votre statut.");
      return;
    }

    if (
      (patch.role !== undefined || patch.status !== undefined) &&
      !canManageUserAccount(currentUserRole, current.role, isSelfAccount(current))
    ) {
      setToast("Action interdite sur un responsable hiérarchique ou un compte protégé.");
      return;
    }

    if (hasRemoteProfiles()) {
      if (!current.remoteId) {
        setToast("Profil introuvable.");
        return;
      }
      const nextRole = (patch.role || current.role) as PlatformRole;
      const scopeTouched =
        patch.chapitre_id !== undefined ||
        patch.district_id !== undefined ||
        patch.groupe_id !== undefined;
      const { data, error } = await updateProfileRemote({
        user_id: current.remoteId,
        role: patch.role,
        status: patch.status ? STATUS_TO_DB[patch.status] : undefined,
        full_name: patch.name,
        ...(scopeTouched
          ? {
              chapitre_id: patch.chapitre_id ?? null,
              district_id: patch.district_id ?? null,
              groupe_id: patch.groupe_id ?? null,
            }
          : {}),
      });
      if (error || !data) {
        setToast(error?.message || "Impossible d’enregistrer.");
        return;
      }
      const mapped = profileFromRemote(data);
      const names = orgTree.nameOf({
        chapitreId: mapped.chapitreId || "",
        districtId: mapped.districtId || "",
        groupeId: mapped.groupeId || "",
      });
      const enriched: ManagedUser = {
        ...mapped,
        chapitre: mapped.chapitre || names.chapitre,
        district: mapped.district || names.district,
        groupe: mapped.groupe || names.groupe,
        department:
          mapped.department ||
          [mapped.chapitre || names.chapitre, mapped.district || names.district, mapped.groupe || names.groupe]
            .filter(Boolean)
            .join(" · "),
      };
      setProfiles((list) => list.map((profile) => (profile.id === id ? enriched : profile)));
      setSelectedProfile((selected) => (selected && selected.id === id ? enriched : selected));
      setToast(
        patch.role
          ? `Rôle mis à jour : ${ROLE_LABELS[nextRole]}.`
          : scopeTouched
            ? "Rattachement organisationnel enregistré."
            : "Profil mis à jour.",
      );
      void syncUsersFromDb();
      return;
    }
    const users = updateManagedUser(id, {
      ...patch,
      chapitre: patch.chapitre ?? current.chapitre,
    });
    setProfiles(users);
    setSelectedProfile(users.find((user) => user.id === id) || null);
  };

  const saveOrgScope = async (user: ManagedUser) => {
    const self = isSelfAccount(user);
    if (!canManageOrgScope(currentUserRole, user.role, self)) {
      setToast("Seul le responsable hiérarchique peut modifier ce rattachement.");
      return;
    }
    setOrgSaving(true);
    try {
      const fields = orgFieldsForRole(user.role);
      if (fields.optionalAttachment && orgDraft.unassigned) {
        await updateProfile(user.id, {
          chapitre_id: null,
          district_id: null,
          groupe_id: null,
          chapitre: "",
          district: "",
          groupe: "",
        });
        return;
      }
      const selection = orgTree.coerceSelection(orgDraft);
      if (fields.chapitre && !selection.chapitreId) {
        throw new Error("Sélectionnez un chapitre.");
      }
      if (fields.district && !selection.districtId) {
        throw new Error("Sélectionnez un district.");
      }
      if (fields.groupe && !selection.groupeId) {
        throw new Error("Sélectionnez un groupe.");
      }
      const names = orgTree.nameOf(selection);
      setOrgDraft({ ...selection, unassigned: false });
      await updateProfile(user.id, {
        chapitre_id: selection.chapitreId || null,
        district_id: selection.districtId || null,
        groupe_id: selection.groupeId || null,
        chapitre: names.chapitre,
        district: names.district,
        groupe: names.groupe,
      });
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Impossible d’enregistrer le périmètre.");
    } finally {
      setOrgSaving(false);
    }
  };

  const requestDeleteUser = (user: ManagedUser) => {
    const self = isSelfAccount(user);
    if (!canDeleteUser(currentUserRole, user.role, self)) {
      setToast("Vous n’avez pas le droit de supprimer ce compte.");
      return;
    }
    setDeleteConfirmUser(user);
  };

  const handleConfirmDeleteUser = async () => {
    const user = deleteConfirmUser;
    if (!user) return;

    const self = isSelfAccount(user);
    if (!canDeleteUser(currentUserRole, user.role, self)) {
      setToast("Vous n’avez pas le droit de supprimer ce compte.");
      setDeleteConfirmUser(null);
      return;
    }

    const label = user.name || user.email;
    setDeletingUser(true);
    setToast(null);
    try {
      if (hasRemoteProfiles()) {
        if (!user.remoteId) {
          throw new Error("Identifiant distant manquant pour cet utilisateur.");
        }
        const { error } = await deleteUserRemote(user.remoteId);
        if (error) throw error;
        await syncUsersFromDb();
      } else {
        applyUsers(deleteManagedUser(user.id));
      }
      setSelectedProfile(null);
      setDeleteConfirmUser(null);
      setToast(`Utilisateur « ${label} » supprimé.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingUser(false);
    }
  };

  const handleUserCreated = (payload: {
    user: ManagedUser;
    message: string;
    temporaryPassword?: string;
  }) => {
    if (hasRemoteProfiles()) {
      if (payload.user.role !== "admin" || currentUserRole === "admin") {
        setProfiles((current) => {
          const next = current.some((user) => user.email.toLowerCase() === payload.user.email.toLowerCase())
            ? current.map((user) =>
                user.email.toLowerCase() === payload.user.email.toLowerCase() ? payload.user : user,
              )
            : [payload.user, ...current];
          return usersVisibleToActor(next, currentUserRole);
        });
      }
      void syncUsersFromDb();
    } else {
      applyUsers(loadManagedUsers());
    }
    if (payload.user.role !== "admin" || currentUserRole === "admin") {
      setSelectedProfile(payload.user);
    }
    setLastTempPassword(payload.temporaryPassword || null);
    setToast(payload.message);
    setRoleFilter("all");
  };

  const handleCopyTempPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setToast("Mot de passe temporaire copié.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast("Impossible de copier automatiquement — sélectionnez le mot de passe.");
    }
  };

  const toggleRbacPermission = (moduleKey: string, role: PlatformRole) => {
    // Paramètres verrouillés : oui admin/centre/chapitre/district, non groupe
    if (moduleKey === "settings") return;
    setRbacMatrix((current) =>
      current.map((row) =>
        row.moduleKey === moduleKey
          ? { ...row, roles: { ...row.roles, [role]: !row.roles[role] } }
          : row,
      ),
    );
    setRbacDirty(true);
  };

  const canEditRbac = currentUserRole === "admin" || currentUserRole === "centre";
  const settingsTabs: Array<{
    key: SettingsTab;
    label: string;
    icon: typeof UserRound;
  }> = [{ key: "users", label: "Utilisateurs", icon: UserRound }];
  if (canEditRbac) {
    settingsTabs.push(
      { key: "rbac", label: "RBAC", icon: Shield },
      { key: "general", label: "Général", icon: Save },
    );
  }

  useEffect(() => {
    if (!canEditRbac && activeTab !== "users") {
      setActiveTab("users");
    }
  }, [canEditRbac, activeTab]);

  const applyRbac = () => {
    const access = matrixToAccess(rbacMatrix);
    saveModuleAccess(access);
    setRbacMatrix(accessToMatrix(access));
    setRbacDirty(false);
    setToast("Matrice RBAC appliquée — la navigation des rôles est mise à jour.");
  };

  const handleResetRbac = () => {
    const access = resetModuleAccess();
    setRbacMatrix(accessToMatrix(access));
    setRbacDirty(false);
    setToast("RBAC réinitialisé aux valeurs par défaut.");
  };

  const persistGeneral = (next: AppSettings) => {
    setAppSettings(next);
    saveAppSettings(next);
    setTheme(next.darkMode ? "dark" : "light");
    setToast("Paramètres généraux enregistrés.");
  };

  useEffect(() => {
    setAppSettings((current) => {
      if (current.darkMode === (theme === "dark")) return current;
      const next = { ...current, darkMode: theme === "dark" };
      saveAppSettings(next);
      return next;
    });
  }, [theme]);

  return (
    <div className="dash-page space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div
          className="relative px-5 py-5 sm:px-6"
          style={{
            background:
              "radial-gradient(ellipse 70% 90% at 0% 0%, rgba(200,151,26,0.12), transparent 55%), radial-gradient(ellipse 50% 80% at 100% 0%, rgba(10,47,82,0.08), transparent 50%)",
          }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--sgi-gold)]">Pilotage</div>
              <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
                Paramètres & accès
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {canEditRbac
                  ? "Invitez les responsables, attribuez les rôles, contrôlez les modules (RBAC) et ajustez les options de l’application."
                  : "Ajoutez et gérez les responsables de votre périmètre. Les comptes hiérarchiquement supérieurs sont protégés."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                    activeTab === tab.key
                      ? "bg-[var(--sgi-blue)] text-white"
                      : "border border-border bg-background/70 text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(toast || remoteNotice) && (
        <div className="rounded-xl border border-[var(--sgi-blue)]/20 bg-[var(--sgi-blue)]/5 px-4 py-3 text-sm text-foreground">
          {toast || remoteNotice}
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Responsables", value: stats.total, tone: "text-[var(--sgi-blue)]" },
              { label: "Actifs", value: stats.actifs, tone: "text-emerald-600" },
              { label: "En attente", value: stats.pending, tone: "text-[var(--sgi-gold)]" },
              { label: "Suspendus", value: stats.suspendus, tone: "text-[var(--sgi-red)]" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-card px-5 py-4">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</div>
                <div className={`mt-2 font-display text-3xl font-semibold ${item.tone}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {lastTempPassword && (
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  <KeyRound size={13} /> Mot de passe temporaire
                </div>
                <div className="mt-1 truncate text-sm text-amber-950" style={{ fontFamily: "var(--font-mono)" }}>
                  {lastTempPassword}
                </div>
                <p className="mt-1 text-xs text-amber-800/80">
                  À communiquer au responsable pour sa première connexion.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyTempPassword(lastTempPassword)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2.5 text-xs font-medium text-white"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copié" : "Copier le mot de passe"}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.85fr)]">
            <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-foreground">Utilisateurs</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sélectionnez un responsable pour voir et modifier sa fiche.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={usersLoading}
                      onClick={() => void syncUsersFromDb()}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3.5 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                    >
                      <RefreshCw size={15} className={usersLoading ? "animate-spin" : undefined} />
                      {usersLoading ? "Chargement…" : "Actualiser"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddUserOpen(true)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-3.5 py-2.5 text-sm font-medium text-white"
                    >
                      <UserPlus size={15} />
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <FilterPanel
                    storageKey="settings-users"
                    activeCount={(query.trim() ? 1 : 0) + (roleFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)}
                    summary={`${visibleProfiles.length} compte${visibleProfiles.length > 1 ? "s" : ""}`}
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
                      <label className="relative block">
                        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Rechercher un nom ou un e-mail…"
                          className="w-full rounded-2xl border border-border bg-input-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[var(--sgi-blue)] focus:ring-2 focus:ring-[var(--sgi-blue)]/10"
                        />
                      </label>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as "all" | PlatformRole)}
                        className="rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
                      >
                        <option value="all">Tous les rôles</option>
                        {ALLOWED_ROLES.filter((role) => currentUserRole === "admin" || role !== "admin").map((role) => (
                          <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                        ))}
                      </select>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "all" | ProfileStatus)}
                        className="rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
                      >
                        <option value="all">Tous les statuts</option>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </FilterPanel>
                </div>
              </div>

              <div className="max-h-[34rem] space-y-2 overflow-y-auto p-3 sm:p-4">
                {visibleProfiles.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-14 text-center text-sm text-muted-foreground">
                    {usersLoading ? "Chargement…" : profiles.length === 0 ? "Aucun utilisateur." : "Aucun résultat."}
                  </div>
                )}
                {visibleProfiles.map((profile) => {
                  const selected = selectedProfile?.id === profile.id;
                  return (
                    <button
                      key={profile.remoteId || profile.id}
                      type="button"
                      onClick={() => setSelectedProfile(profile)}
                      className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                        selected
                          ? "border-[var(--sgi-blue)]/35 bg-[var(--sgi-blue)]/5 shadow-sm"
                          : "border-transparent bg-muted/25 hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <MemberAvatar photo={profile.photo} name={profile.name} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-foreground">{profile.name}</div>
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">{profile.email}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <RoleBadge role={profile.role} />
                          <StatutBadge statut={profile.status} />
                        </div>
                      </div>
                      <span className={`hidden text-xs font-medium sm:inline ${selected ? "text-[var(--sgi-blue)]" : "text-muted-foreground"}`}>
                        {selected ? "Sélectionné" : "Voir"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              {selectedProfile ? (
                (() => {
                  const isAdminAccount = selectedProfile.role === "admin";
                  const isOwnAccount = isSelfAccount(selectedProfile);
                  const canEditAccount = canManageUserAccount(
                    currentUserRole,
                    selectedProfile.role,
                    isOwnAccount,
                  );
                  const roleStatusLocked = isAdminAccount || isOwnAccount || !canEditAccount;
                  const canEditOrg = canManageOrgScope(
                    currentUserRole,
                    selectedProfile.role,
                    isOwnAccount,
                  );
                  const canRemoveUser = canDeleteUser(
                    currentUserRole,
                    selectedProfile.role,
                    isOwnAccount,
                  );
                  const orgFields = orgFieldsForRole(selectedProfile.role);
                  const roleOptions = isAdminAccount
                    ? ([selectedProfile.role] as PlatformRole[])
                    : assignableRoles(currentUserRole).includes(selectedProfile.role)
                      ? assignableRoles(currentUserRole)
                      : [selectedProfile.role, ...assignableRoles(currentUserRole)];
                  const scopeLabel =
                    selectedProfile.role === "admin" && !selectedProfile.chapitre
                      ? "Centre Miroir Parfait"
                      : [selectedProfile.chapitre, selectedProfile.district, selectedProfile.groupe]
                          .filter(Boolean)
                          .join(" · ") ||
                        selectedProfile.department ||
                        "—";

                  return (
                    <div className="flex h-full flex-col">
                      <div
                        className="border-b border-border px-5 pb-5 pt-5 sm:px-6"
                        style={{
                          background:
                            "radial-gradient(ellipse 80% 120% at 0% 0%, rgba(200,151,26,0.12), transparent 55%), radial-gradient(ellipse 70% 100% at 100% 0%, rgba(10,47,82,0.10), transparent 50%)",
                        }}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--sgi-gold)]">
                          {isOwnAccount ? "Votre compte" : "Fiche utilisateur"}
                        </p>
                        <div className="mt-4 flex items-start gap-4">
                          <MemberAvatar photo={selectedProfile.photo} name={selectedProfile.name} size="xl" />
                          <div className="min-w-0 pt-1">
                            <h3 className="truncate font-display text-xl font-semibold text-foreground">
                              {selectedProfile.name}
                            </h3>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{selectedProfile.email}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <RoleBadge role={selectedProfile.role} />
                              <StatutBadge statut={selectedProfile.status} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/25 px-4 py-3 text-sm">
                            <Mail size={15} className="shrink-0 text-[var(--sgi-blue)]" />
                            <span className="truncate text-foreground">{selectedProfile.email}</span>
                          </div>
                          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/25 px-4 py-3 text-sm">
                            <Phone size={15} className="shrink-0 text-[var(--sgi-gold)]" />
                            <span className="text-foreground">{selectedProfile.telephone || "—"}</span>
                          </div>
                          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/25 px-4 py-3 text-sm">
                            <MapPin size={15} className="shrink-0 text-[var(--sgi-red)]" />
                            <span className="text-foreground">{scopeLabel}</span>
                          </div>
                        </div>

                        {canEditOrg && (orgFields.chapitre || orgFields.optionalAttachment) && (
                          <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Rattachement organisationnel
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {isOwnAccount
                                  ? "En tant que responsable centre, vous pouvez vous rattacher à un groupe."
                                  : "Réservé au responsable hiérarchique."}
                              </p>
                            </div>
                            {orgFields.optionalAttachment && (
                              <label className="flex items-center gap-2 text-sm text-foreground">
                                <input
                                  type="checkbox"
                                  checked={orgDraft.unassigned}
                                  onChange={(e) => {
                                    const nextUnassigned = e.target.checked;
                                    if (nextUnassigned) {
                                      setOrgDraft((prev) => ({ ...prev, unassigned: true }));
                                      return;
                                    }
                                    setOrgDraft({
                                      ...orgTree.coerceSelection(
                                        orgDraft.chapitreId
                                          ? orgDraft
                                          : orgTree.defaultSelection,
                                      ),
                                      unassigned: false,
                                    });
                                  }}
                                />
                                Aucun rattachement de groupe
                              </label>
                            )}
                            {orgTree.error && (
                              <p className="text-sm text-destructive">{orgTree.error}</p>
                            )}
                            {!orgDraft.unassigned && orgFields.chapitre && (
                              <label className="block space-y-1.5">
                                <span className="text-xs font-medium text-muted-foreground">Chapitre</span>
                                <select
                                  value={orgDraft.chapitreId}
                                  disabled={orgTree.loading || orgTree.chapitres.length === 0}
                                  onChange={(e) =>
                                    setOrgDraft((prev) => ({
                                      ...orgTree.coerceSelection({
                                        chapitreId: e.target.value,
                                        districtId: "",
                                        groupeId: "",
                                      }),
                                      unassigned: false,
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
                                >
                                  {orgTree.loading && <option value="">Chargement…</option>}
                                  {orgTree.chapitres.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {!orgDraft.unassigned && orgFields.district && (
                              <label className="block space-y-1.5">
                                <span className="text-xs font-medium text-muted-foreground">District</span>
                                <select
                                  value={orgDraft.districtId}
                                  disabled={orgTree.loading || !orgDraft.chapitreId}
                                  onChange={(e) =>
                                    setOrgDraft((prev) => ({
                                      ...orgTree.coerceSelection({
                                        chapitreId: prev.chapitreId,
                                        districtId: e.target.value,
                                        groupeId: "",
                                      }),
                                      unassigned: false,
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
                                >
                                  {orgTree.districtsForChapitreId(orgDraft.chapitreId).map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                            {!orgDraft.unassigned && orgFields.groupe && (
                              <label className="block space-y-1.5">
                                <span className="text-xs font-medium text-muted-foreground">Groupe</span>
                                <select
                                  value={orgDraft.groupeId}
                                  disabled={orgTree.loading || !orgDraft.districtId}
                                  onChange={(e) =>
                                    setOrgDraft((prev) => ({
                                      ...prev,
                                      groupeId: e.target.value,
                                      unassigned: false,
                                    }))
                                  }
                                  className="w-full rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
                                >
                                  {orgTree.groupesForDistrictId(orgDraft.districtId).map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                            <button
                              type="button"
                              disabled={orgSaving}
                              onClick={() => void saveOrgScope(selectedProfile)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-3.5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                            >
                              <Save size={14} />
                              {orgSaving ? "Enregistrement…" : "Enregistrer le rattachement"}
                            </button>
                          </div>
                        )}

                        {!canEditOrg && (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Le changement de chapitre / district / groupe est réservé au responsable hiérarchique.
                          </p>
                        )}

                        <div className="grid gap-3">
                          <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Rôle</span>
                            <select
                              value={selectedProfile.role}
                              disabled={roleStatusLocked}
                              onChange={(e) =>
                                void updateProfile(selectedProfile.id, { role: e.target.value as PlatformRole })
                              }
                              className="w-full rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none disabled:opacity-55"
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Statut</span>
                            <select
                              value={selectedProfile.status}
                              disabled={roleStatusLocked}
                              onChange={(e) =>
                                void updateProfile(selectedProfile.id, { status: e.target.value as ProfileStatus })
                              }
                              className="w-full rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none disabled:opacity-55"
                            >
                              {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {selectedProfile.role === "admin" && !isOwnAccount && (
                          <p className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                            Le compte administrateur est protégé : rôle et statut ne peuvent pas être modifiés ici.
                          </p>
                        )}

                        {selectedProfile.status === "En attente" && !isOwnAccount && (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            Compte en attente — activez-le en passant le statut à « Actif ».
                          </p>
                        )}

                        {canRemoveUser && (
                          <div className="rounded-2xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sgi-red)]">
                              Zone sensible
                            </p>
                            <button
                              type="button"
                              disabled={deletingUser}
                              onClick={() => requestDeleteUser(selectedProfile)}
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--sgi-red)]/30 bg-[var(--sgi-red)] px-3.5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                            >
                              <Trash2 size={15} />
                              Supprimer l’utilisateur
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]">
                    <UserRound size={24} />
                  </div>
                  <div>
                    <p className="font-display text-base font-semibold text-foreground">Aucun utilisateur sélectionné</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choisissez un responsable dans la liste pour afficher sa fiche.
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {activeTab === "rbac" && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                Matrice RBAC
              </div>
              <p className="text-xs text-muted-foreground">
                Activez ou désactivez les modules par responsabilité. Les changements s’appliquent immédiatement à la navigation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleResetRbac}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={applyRbac}
                disabled={!rbacDirty}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                <Save size={14} />
                Appliquer
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module</th>
                  {ALLOWED_ROLES.map((role) => (
                    <th key={role} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rbacMatrix.map((row) => (
                  <tr key={row.moduleKey} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.module}</td>
                    {ALLOWED_ROLES.map((role) => {
                      const locked = row.moduleKey === "settings";
                      return (
                        <td key={`${row.moduleKey}-${role}`} className="px-3 py-2.5">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => toggleRbacPermission(row.moduleKey, role)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
                              row.roles[role]
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {row.roles[role] ? "Oui" : "Non"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "general" && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Paramètres généraux
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                key: "darkMode" as const,
                label: "Mode sombre",
                hint: "Applique immédiatement le thème de l’interface.",
              },
              {
                key: "emailAlerts" as const,
                label: "Notifications par e-mail",
                hint: "Alertes pour invitations, validations et rappels opérationnels.",
              },
              {
                key: "autoUpdates" as const,
                label: "Mises à jour automatiques",
                hint: "Actualisation périodique des tableaux de bord et listes.",
              },
            ].map((setting) => (
              <label
                key={setting.key}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-muted/30 px-4 py-4"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">{setting.label}</div>
                  <div className="text-xs text-muted-foreground">{setting.hint}</div>
                </div>
                <input
                  type="checkbox"
                  checked={appSettings[setting.key]}
                  onChange={(e) => persistGeneral({ ...appSettings, [setting.key]: e.target.checked })}
                  className="h-5 w-5 rounded border border-border bg-input-background text-primary"
                />
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Ces options s’appliquent à votre espace de travail.
          </p>
        </div>
      )}

      <PersonCreateForm
        mode="responsable"
        actorRole={currentUserRole}
        variant="modal"
        open={addUserOpen}
        initialOrg={
          currentUserRole === "chapitre" || currentUserRole === "district"
            ? {
                chapitre: actorOrg.chapitre,
                district: actorOrg.district,
                groupe: actorOrg.groupe,
              }
            : undefined
        }
        onCancel={() => setAddUserOpen(false)}
        onSuccess={({ user, temporaryPassword, message }) => {
          if (user) {
            handleUserCreated({
              user,
              temporaryPassword,
              message,
            });
          } else {
            setLastTempPassword(temporaryPassword || null);
            setToast(message);
            void syncUsersFromDb();
          }
          setAddUserOpen(false);
        }}
      />

      {deleteConfirmUser && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
          onClick={() => {
            if (!deletingUser) setDeleteConfirmUser(null);
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
          >
            <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sgi-red)]/12 text-[var(--sgi-red)]">
                  <Trash2 size={18} />
                </span>
                <div>
                  <h3
                    id="delete-user-title"
                    className="font-display text-lg font-semibold text-foreground"
                  >
                    Confirmer la suppression
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Voulez-vous vraiment supprimer{" "}
                    <span className="font-semibold text-foreground">
                      {deleteConfirmUser.name || deleteConfirmUser.email}
                    </span>
                    {" "}({deleteConfirmUser.email}) ?
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--sgi-red)]/20 bg-[var(--sgi-red)]/5 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                Cette action est irréversible. Le compte ne pourra plus se connecter.
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={deletingUser}
                  onClick={() => setDeleteConfirmUser(null)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={deletingUser}
                  onClick={() => void handleConfirmDeleteUser()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-red)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  <Trash2 size={15} />
                  {deletingUser ? "Suppression…" : "Oui, supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
