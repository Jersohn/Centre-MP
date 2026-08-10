import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Plus,
  Save,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { PlatformRole } from "./roles";
import { ROLE_LABELS } from "./roles";
import { useOrgTree } from "./useOrgTree";
import type { CollectePayment } from "./zaimuQuota";
import { formatFcfa } from "./zaimuQuota";
import { memberFullName } from "./membersData";
import { useOpsData } from "./opsDataStore";
import { fetchMyProfile } from "../services/profileService";
import { RowActionsMenu } from "./RowActionsMenu";
import { useConfirm } from "./ConfirmDialog";
import {
  createSpecialCampaign,
  deleteSpecialCampaign,
  editableChildLevel,
  getSpecialCampaign,
  listMyAssignedSpecialCampaigns,
  listQuotaAssignments,
  listSpecialCampaigns,
  setCentreObjective,
  updateSpecialCampaign,
  upsertChildQuotas,
  type QuotaAssignment,
  type ZaimuCampaign,
} from "../services/quotaService";

type Props = {
  role: PlatformRole;
  collectes: CollectePayment[];
  /** Ouvre directement une campagne (ex. depuis le profil). */
  initialCampaignId?: string | null;
  compact?: boolean;
  onCampaignChange?: (campaignId: string | null) => void;
};

type DraftRow = {
  key: string;
  label: string;
  chapitre_id: string | null;
  district_id: string | null;
  groupe_id: string | null;
  member_id: string | null;
  assigne: number;
  date_echeance: string;
  paye: number;
};

function paidForScope(
  collectes: CollectePayment[],
  scope: { chapitre?: string; district?: string; groupe?: string },
  campaignLabel?: string,
) {
  const label = (campaignLabel || "").trim().toLowerCase();
  return collectes
    .filter((c) => c.type === "zaimu-special" && c.statut === "Validé")
    .filter((c) => {
      if (scope.chapitre && c.chapitre !== scope.chapitre) return false;
      if (scope.district && c.district !== scope.district) return false;
      if (scope.groupe && c.groupe !== scope.groupe) return false;
      if (label) {
        const periode = (c.periode || "").trim().toLowerCase();
        const motif = (c.motif || "").trim().toLowerCase();
        if (periode !== label && motif !== label) return false;
      }
      return true;
    })
    .reduce((sum, c) => sum + c.montant, 0);
}

function paidForMember(
  collectes: CollectePayment[],
  memberName: string,
  campaignLabel?: string,
) {
  const name = memberName.trim().toLowerCase();
  const label = (campaignLabel || "").trim().toLowerCase();
  return collectes
    .filter((c) => c.type === "zaimu-special" && c.statut === "Validé")
    .filter((c) => c.membre.trim().toLowerCase() === name)
    .filter((c) => {
      if (!label) return true;
      const periode = (c.periode || "").trim().toLowerCase();
      const motif = (c.motif || "").trim().toLowerCase();
      return periode === label || motif === label;
    })
    .reduce((sum, c) => sum + c.montant, 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function ZaimuSpecialCampaignsPanel({
  role,
  collectes,
  initialCampaignId = null,
  compact = false,
  onCampaignChange,
}: Props) {
  const { confirm } = useConfirm();
  const orgTree = useOrgTree();
  const { members } = useOpsData();
  const canEdit = editableChildLevel(role);
  const canCreate = role === "admin" || role === "centre";

  const [campaigns, setCampaigns] = useState<ZaimuCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialCampaignId);
  const [campaign, setCampaign] = useState<ZaimuCampaign | null>(null);
  const [assignments, setAssignments] = useState<QuotaAssignment[]>([]);
  const [profileScope, setProfileScope] = useState<{
    chapitre_id: string | null;
    district_id: string | null;
    groupe_id: string | null;
  }>({ chapitre_id: null, district_id: null, groupe_id: null });
  const [objectif, setObjectif] = useState(0);
  const [echeanceCampagne, setEcheanceCampagne] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    label: "",
    date_echeance: "",
    montant_centre: "",
  });
  const [editForm, setEditForm] = useState({
    label: "",
    date_echeance: "",
    montant_centre: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const reloadList = async () => {
    setLoading(true);
    setError(null);
    const profileRes = await fetchMyProfile();
    const chapitre_id = profileRes.data?.chapitre_id ?? null;
    const district_id = profileRes.data?.district_id ?? null;
    const groupe_id = profileRes.data?.groupe_id ?? null;
    setProfileScope({ chapitre_id, district_id, groupe_id });

    if (canCreate) {
      const listRes = await listSpecialCampaigns();
      if (listRes.error) {
        setError(listRes.error.message);
        setCampaigns([]);
      } else {
        setCampaigns(listRes.data);
      }
    } else {
      const assigned = await listMyAssignedSpecialCampaigns({
        role,
        chapitre_id,
        district_id,
        groupe_id,
      });
      if (assigned.error) {
        setError(assigned.error.message);
        setCampaigns([]);
      } else {
        setCampaigns(assigned.data.map((item) => item.campaign));
      }
    }
    setLoading(false);
  };

  const reloadDetail = async (id: string) => {
    setError(null);
    const [campRes, assignRes] = await Promise.all([
      getSpecialCampaign(id),
      listQuotaAssignments(id),
    ]);
    if (campRes.error || !campRes.data) {
      setError(campRes.error?.message || "Campagne introuvable.");
      setCampaign(null);
      return;
    }
    if (assignRes.error) {
      setError(assignRes.error.message);
      return;
    }
    setCampaign(campRes.data);
    setObjectif(campRes.data.montant_centre);
    setEcheanceCampagne(campRes.data.date_echeance || "");
    setAssignments(assignRes.data);
  };

  useEffect(() => {
    void reloadList();
  }, [role]);

  useEffect(() => {
    if (initialCampaignId) setSelectedId(initialCampaignId);
  }, [initialCampaignId]);

  useEffect(() => {
    onCampaignChange?.(selectedId);
  }, [selectedId, onCampaignChange]);

  useEffect(() => {
    if (!selectedId) {
      setCampaign(null);
      setDrafts([]);
      return;
    }
    void reloadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!campaign || orgTree.loading) return;

    const campaignLabel = campaign.label;
    const findRow = (
      level: "chapitre" | "district" | "groupe",
      ids: { chapitre_id?: string | null; district_id?: string | null; groupe_id?: string | null },
    ) =>
      assignments.find((a) => {
        if (a.level !== level) return false;
        if (level === "chapitre") return a.chapitre_id === ids.chapitre_id;
        if (level === "district") {
          return a.chapitre_id === ids.chapitre_id && a.district_id === ids.district_id;
        }
        return (
          a.chapitre_id === ids.chapitre_id &&
          a.district_id === ids.district_id &&
          a.groupe_id === ids.groupe_id
        );
      });

    const fallbackDate = campaign.date_echeance || "";

    if (canEdit === "chapitre") {
      setDrafts(
        orgTree.chapitres.map((c) => {
          const existing = findRow("chapitre", { chapitre_id: c.id });
          return {
            key: c.id,
            label: c.name,
            chapitre_id: c.id,
            district_id: null,
            groupe_id: null,
            member_id: null,
            assigne: Number(existing?.assigne || 0),
            date_echeance: existing?.date_echeance || fallbackDate,
            paye: paidForScope(collectes, { chapitre: c.name }, campaignLabel),
          };
        }),
      );
      return;
    }

    if (canEdit === "district") {
      const chapitreId = profileScope.chapitre_id;
      const districts = orgTree.districts.filter((d) =>
        chapitreId ? d.chapitre_id === chapitreId : true,
      );
      setDrafts(
        districts.map((d) => {
          const existing = findRow("district", {
            chapitre_id: d.chapitre_id,
            district_id: d.id,
          });
          return {
            key: d.id,
            label: d.name,
            chapitre_id: d.chapitre_id,
            district_id: d.id,
            groupe_id: null,
            member_id: null,
            assigne: Number(existing?.assigne || 0),
            date_echeance: existing?.date_echeance || fallbackDate,
            paye: paidForScope(
              collectes,
              {
                chapitre: d.chapitre_name || undefined,
                district: d.name,
              },
              campaignLabel,
            ),
          };
        }),
      );
      return;
    }

    if (canEdit === "groupe") {
      const districtId = profileScope.district_id;
      const groupes = orgTree.groupes.filter((g) =>
        districtId ? g.district_id === districtId : true,
      );
      setDrafts(
        groupes.map((g) => {
          const parentDistrict = orgTree.districts.find((d) => d.id === g.district_id);
          const chapitreId = g.chapitre_id || parentDistrict?.chapitre_id || null;
          const existing = findRow("groupe", {
            chapitre_id: chapitreId,
            district_id: g.district_id,
            groupe_id: g.id,
          });
          return {
            key: g.id,
            label: g.name,
            chapitre_id: chapitreId,
            district_id: g.district_id,
            groupe_id: g.id,
            member_id: null,
            assigne: Number(existing?.assigne || 0),
            date_echeance: existing?.date_echeance || fallbackDate,
            paye: paidForScope(
              collectes,
              {
                chapitre: g.chapitre_name || parentDistrict?.chapitre_name || undefined,
                district: g.district_name || parentDistrict?.name || undefined,
                groupe: g.name,
              },
              campaignLabel,
            ),
          };
        }),
      );
      return;
    }

    if (canEdit === "membre") {
      const groupeId = profileScope.groupe_id;
      const groupe = orgTree.groupes.find((g) => g.id === groupeId);
      const districtId = profileScope.district_id || groupe?.district_id || null;
      const district = orgTree.districts.find((d) => d.id === districtId);
      const chapitreId =
        profileScope.chapitre_id || district?.chapitre_id || groupe?.chapitre_id || null;

      const groupMembers = members.filter((m) => {
        if (m.source === "profile") return false;
        if (!m.remoteId) return false;
        if (groupeId && m.groupeId) return m.groupeId === groupeId;
        if (groupe?.name) {
          return m.groupe.trim().toLowerCase() === groupe.name.trim().toLowerCase();
        }
        return false;
      });

      setDrafts(
        groupMembers.map((m) => {
          const existing = assignments.find(
            (a) => a.level === "membre" && a.member_id === m.remoteId,
          );
          return {
            key: m.remoteId!,
            label: memberFullName(m),
            chapitre_id: chapitreId || m.chapitreId || null,
            district_id: districtId || m.districtId || null,
            groupe_id: groupeId || m.groupeId || null,
            member_id: m.remoteId!,
            assigne: Number(existing?.assigne || 0),
            date_echeance: existing?.date_echeance || fallbackDate,
            paye: paidForMember(collectes, memberFullName(m), campaignLabel),
          };
        }),
      );
      return;
    }

    setDrafts([]);
  }, [
    campaign,
    assignments,
    orgTree.loading,
    orgTree.chapitres,
    orgTree.districts,
    orgTree.groupes,
    canEdit,
    profileScope.chapitre_id,
    profileScope.district_id,
    profileScope.groupe_id,
    collectes,
    members,
  ]);

  const parentAssigned = useMemo(() => {
    if (canCreate) return objectif;
    if (canEdit === "district" && profileScope.chapitre_id) {
      return (
        assignments.find(
          (a) => a.level === "chapitre" && a.chapitre_id === profileScope.chapitre_id,
        )?.assigne || 0
      );
    }
    if (canEdit === "groupe" && profileScope.district_id) {
      return (
        assignments.find(
          (a) => a.level === "district" && a.district_id === profileScope.district_id,
        )?.assigne || 0
      );
    }
    if (canEdit === "membre" && profileScope.groupe_id) {
      return (
        assignments.find(
          (a) => a.level === "groupe" && a.groupe_id === profileScope.groupe_id,
        )?.assigne || 0
      );
    }
    return 0;
  }, [canCreate, canEdit, objectif, assignments, profileScope]);

  const childrenSum = drafts.reduce((sum, row) => sum + (Number(row.assigne) || 0), 0);
  const totalPaye = drafts.reduce((sum, row) => sum + row.paye, 0);
  const surplusRepartition = Math.max(0, childrenSum - parentAssigned);
  const surplusCollecte = drafts.reduce(
    (sum, row) => sum + Math.max(0, row.paye - (Number(row.assigne) || 0)),
    0,
  );
  const resteGlobal = Math.max(0, parentAssigned - totalPaye);
  const childLabel =
    canEdit === "chapitre"
      ? "Chapitre"
      : canEdit === "district"
        ? "District"
        : canEdit === "groupe"
          ? "Groupe"
          : "Membre";

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    setToast(null);
    const { data, error: createError } = await createSpecialCampaign({
      label: createForm.label,
      date_echeance: createForm.date_echeance,
      montant_centre: Number(createForm.montant_centre) || 0,
    });
    setSaving(false);
    if (createError || !data) {
      setError(createError?.message || "Création impossible.");
      return;
    }
    setCreating(false);
    setCreateForm({ label: "", date_echeance: "", montant_centre: "" });
    setToast("Campagne créée. Définissez maintenant la répartition par chapitre.");
    await reloadList();
    setSelectedId(data.id);
  };

  const startEdit = (item: ZaimuCampaign) => {
    setCreating(false);
    setEditingId(item.id);
    setEditForm({
      label: item.label,
      date_echeance: item.date_echeance || "",
      montant_centre: String(item.montant_centre || ""),
    });
    setError(null);
    setToast(null);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    setToast(null);
    const { data, error: updateError } = await updateSpecialCampaign({
      id: editingId,
      label: editForm.label,
      date_echeance: editForm.date_echeance,
      montant_centre: Number(editForm.montant_centre) || 0,
    });
    setSaving(false);
    if (updateError || !data) {
      setError(updateError?.message || "Modification impossible.");
      return;
    }
    setEditingId(null);
    setToast("Campagne mise à jour.");
    await reloadList();
    if (selectedId === data.id) {
      await reloadDetail(data.id);
    }
  };

  const handleDelete = async (item: ZaimuCampaign) => {
    const confirmed = await confirm({
      title: "Supprimer cette campagne ?",
      description: `« ${item.label} »\nLes cotas associées seront également supprimées. Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setToast(null);
    const { error: deleteError } = await deleteSpecialCampaign(item.id);
    setSaving(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (selectedId === item.id) setSelectedId(null);
    if (editingId === item.id) setEditingId(null);
    setToast("Campagne supprimée.");
    await reloadList();
  };

  const handleSaveDistribution = async () => {
    if (!campaign || !canEdit) return;
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      if (canCreate) {
        const { error: objError } = await setCentreObjective({
          campaignId: campaign.id,
          montant: objectif,
          date_echeance: echeanceCampagne || null,
        });
        if (objError) throw objError;
      }
      const { error: upsertError } = await upsertChildQuotas({
        campaignId: campaign.id,
        level: canEdit,
        publish: canEdit === "chapitre" && childrenSum > 0,
        rows: drafts.map((row) => ({
          chapitre_id: row.chapitre_id,
          district_id: row.district_id,
          groupe_id: row.groupe_id,
          member_id: row.member_id,
          assigne: Number(row.assigne) || 0,
          date_echeance: row.date_echeance || null,
        })),
      });
      if (upsertError) throw upsertError;
      setToast(
        canEdit === "chapitre"
          ? "Répartition enregistrée. Les responsables chapitre la reçoivent dans leur profil."
          : canEdit === "membre"
            ? "Cotas membres enregistrées. Chaque membre voit son engagement, le payé et le reste."
            : "Cotas enregistrées pour le niveau suivant.",
      );
      await reloadDetail(campaign.id);
      await reloadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || orgTree.loading) {
    return (
      <div className="rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        Chargement des campagnes zaimu spécial…
      </div>
    );
  }

  // ——— Liste + création ———
  if (!selectedId) {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Campagnes zaimu spécial
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {canCreate
                  ? "Créez une campagne, puis répartissez les cotas par chapitre. Les responsables les reçoivent ensuite dans leur profil."
                  : role === "groupe"
                    ? "Campagnes assignées à votre groupe — ouvrez-en une pour répartir les cotas entre vos membres."
                    : "Campagnes publiées pour votre périmètre — ouvrez-en une pour répartir vers le niveau suivant."}
              </p>
            </div>
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setCreating((v) => !v);
                  setError(null);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--sgi-red)] px-3.5 py-2 text-sm font-semibold text-white"
              >
                <Plus size={14} />
                Nouvelle campagne
              </button>
            )}
          </div>

          {(error || toast) && (
            <div className="space-y-2 px-4 pt-4 sm:px-5">
              {error && (
                <div className="rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/5 px-3 py-2 text-sm text-[var(--sgi-red)]">
                  {error}
                </div>
              )}
              {toast && (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                  {toast}
                </div>
              )}
            </div>
          )}

          {creating && canCreate && (
            <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-3 sm:p-5">
              <label className="block text-sm sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Nom</span>
                <input
                  className="dash-field"
                  value={createForm.label}
                  onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Ex. Zaimu temple 2026"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Date d’échéance
                </span>
                <input
                  type="date"
                  className="dash-field"
                  value={createForm.date_echeance}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, date_echeance: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Montant à couvrir (FCFA)
                </span>
                <input
                  type="number"
                  min={0}
                  className="dash-field font-mono"
                  value={createForm.montant_centre}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, montant_centre: e.target.value }))
                  }
                />
              </label>
              <div className="sm:col-span-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-xl border border-border px-3.5 py-2 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleCreate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? "Création…" : "Créer la campagne"}
                </button>
              </div>
            </div>
          )}

          {editingId && canCreate && (
            <div className="grid gap-3 border-b border-border bg-[var(--sgi-blue)]/5 p-4 sm:grid-cols-3 sm:p-5">
              <div className="sm:col-span-3">
                <p className="text-sm font-semibold text-foreground">Modifier la campagne</p>
                <p className="text-xs text-muted-foreground">
                  Nom, échéance et montant centre — les cotas niveau centre seront synchronisées.
                </p>
              </div>
              <label className="block text-sm sm:col-span-1">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Nom</span>
                <input
                  className="dash-field"
                  value={editForm.label}
                  onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Date d’échéance
                </span>
                <input
                  type="date"
                  className="dash-field"
                  value={editForm.date_echeance}
                  onChange={(e) => setEditForm((f) => ({ ...f, date_echeance: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Montant à couvrir (FCFA)
                </span>
                <input
                  type="number"
                  min={0}
                  className="dash-field font-mono"
                  value={editForm.montant_centre}
                  onChange={(e) => setEditForm((f) => ({ ...f, montant_centre: e.target.value }))}
                />
              </label>
              <div className="sm:col-span-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-xl border border-border px-3.5 py-2 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleUpdate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </div>
          )}

          <div className="divide-y divide-border">
            {campaigns.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground sm:px-5">
                Aucune campagne zaimu spécial pour le moment.
              </p>
            ) : (
              campaigns.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                    editingId === item.id ? "bg-[var(--sgi-blue)]/5" : "hover:bg-secondary/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setToast(null);
                      setEditingId(null);
                      setSelectedId(item.id);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.published_at ? "Publiée aux responsables" : "Brouillon — répartition à soumettre"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} />
                        Échéance {formatDate(item.date_echeance)}
                      </span>
                      <span className="font-mono font-semibold text-foreground">
                        {formatFcfa(item.montant_centre)} FCFA
                      </span>
                    </div>
                  </button>
                  {canCreate && (
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card"
                      >
                        <Pencil size={13} />
                        Modifier
                      </button>
                      <RowActionsMenu
                        actions={[
                          {
                            label: "Ouvrir la répartition",
                            icon: <Target size={14} />,
                            onClick: () => {
                              setEditingId(null);
                              setSelectedId(item.id);
                            },
                          },
                          {
                            label: "Modifier",
                            icon: <Pencil size={14} />,
                            onClick: () => startEdit(item),
                          },
                          {
                            label: "Supprimer",
                            icon: <Trash2 size={14} />,
                            tone: "danger",
                            onClick: () => void handleDelete(item),
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ——— Détail / répartition ———
  if (!canEdit) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Retour aux campagnes
        </button>
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          La répartition des cotas est réservée au centre, aux chapitres, districts et groupes.
          Votre rôle ({ROLE_LABELS[role]}) consulte les montants reçus dans le profil.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setSelectedId(null);
          setToast(null);
        }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Retour aux campagnes
      </button>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {campaign?.label || "Campagne"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {canCreate
                ? "Répartissez le montant par chapitre et fixez les échéances, puis soumettez."
                : canEdit === "district"
                  ? "Répartissez la cota de votre chapitre entre les districts."
                  : canEdit === "groupe"
                    ? "Répartissez la cota de votre district entre les groupes."
                    : "Répartissez la cota de votre groupe entre les membres (engagement, payé, reste)."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              <CalendarDays size={14} className="text-[var(--sgi-red)]" />
              Échéance {formatDate(campaign?.date_echeance)}
            </div>
            {canCreate && campaign && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(null);
                    startEdit(campaign);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/50"
                >
                  <Pencil size={13} />
                  Modifier
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDelete(campaign)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sgi-red)]/30 px-3 py-2 text-xs font-medium text-[var(--sgi-red)] hover:bg-[var(--sgi-red)]/5 disabled:opacity-60"
                >
                  <Trash2 size={13} />
                  Supprimer
                </button>
              </>
            )}
          </div>
        </div>

        {(error || toast) && (
          <div className="space-y-2 px-4 pt-4 sm:px-5">
            {error && (
              <div className="rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/5 px-3 py-2 text-sm text-[var(--sgi-red)]">
                {error}
              </div>
            )}
            {toast && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
                {toast}
              </div>
            )}
          </div>
        )}

        <div
          className={`grid gap-3 p-4 sm:grid-cols-2 ${compact ? "lg:grid-cols-2" : "lg:grid-cols-3"} sm:p-5`}
        >
          <div className="rounded-2xl border border-border bg-background/40 p-3.5 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] font-medium text-muted-foreground">
              {canCreate ? "Montant centre (FCFA)" : "Cota reçue (FCFA)"}
            </p>
            {canCreate ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  min={0}
                  value={objectif || ""}
                  onChange={(e) => setObjectif(Number(e.target.value) || 0)}
                  className="dash-field font-mono"
                />
                <input
                  type="date"
                  value={echeanceCampagne}
                  onChange={(e) => setEcheanceCampagne(e.target.value)}
                  className="dash-field"
                  title="Échéance campagne"
                />
              </div>
            ) : (
              <p
                className="mt-1 font-display text-2xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {formatFcfa(parentAssigned)}
              </p>
            )}
          </div>
          <QuotaCard
            icon={Target}
            label={`Somme cotas ${childLabel.toLowerCase()}s`}
            value={`${formatFcfa(childrenSum)} FCFA`}
            hint={
              surplusRepartition > 0
                ? `Surplus répartition ${formatFcfa(surplusRepartition)} FCFA`
                : "Répartition en cours"
            }
            tone={surplusRepartition > 0 ? "gold" : "blue"}
          />
          <QuotaCard
            icon={Wallet}
            label="Payé (validé)"
            value={`${formatFcfa(totalPaye)} FCFA`}
            hint={`Reste ${formatFcfa(resteGlobal)} FCFA`}
            tone="green"
          />
          <QuotaCard
            icon={TrendingUp}
            label="Surplus collecté"
            value={`${formatFcfa(surplusCollecte)} FCFA`}
            hint="Payé au-delà de la cota assignée"
            tone={surplusCollecte > 0 ? "gold" : "blue"}
          />
          <QuotaCard
            icon={TrendingUp}
            label="Surplus répartition"
            value={`${formatFcfa(surplusRepartition)} FCFA`}
            hint="Cotas enfants au-delà du parent"
            tone={surplusRepartition > 0 ? "gold" : "blue"}
          />
        </div>

        <div className="overflow-x-auto px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Répartition par {childLabel.toLowerCase()}
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveDistribution()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--sgi-red)] px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Save size={14} />
              {saving
                ? "Enregistrement…"
                : canEdit === "chapitre"
                  ? "Soumettre aux chapitres"
                  : canEdit === "membre"
                    ? "Enregistrer les cotas membres"
                    : "Enregistrer les cotas"}
            </button>
          </div>
          {canEdit === "membre" && drafts.length === 0 && (
            <p className="mb-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Aucun membre du groupe à qui assigner une cota. Ajoutez des membres dans l’onglet Membres.
            </p>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {[childLabel, "Cota assignée", "Échéance", "Payé", "Reste", "Surplus"].map((h) => (
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
              {drafts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-sm text-muted-foreground">
                    Aucune unité à répartir pour votre périmètre.
                  </td>
                </tr>
              ) : (
                drafts.map((row) => {
                  const assigne = Number(row.assigne) || 0;
                  const reste = Math.max(0, assigne - row.paye);
                  const surplus = Math.max(0, row.paye - assigne);
                  return (
                    <tr key={row.key} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2.5 font-medium text-foreground">{row.label}</td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min={0}
                          value={row.assigne || ""}
                          onChange={(e) => {
                            const value = Number(e.target.value) || 0;
                            setDrafts((prev) =>
                              prev.map((item) =>
                                item.key === row.key ? { ...item, assigne: value } : item,
                              ),
                            );
                          }}
                          className="dash-field max-w-[10rem] font-mono"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="date"
                          value={row.date_echeance || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDrafts((prev) =>
                              prev.map((item) =>
                                item.key === row.key
                                  ? { ...item, date_echeance: value }
                                  : item,
                              ),
                            );
                          }}
                          className="dash-field max-w-[11rem]"
                        />
                      </td>
                      <td className="px-3 py-2.5 font-mono text-emerald-700 dark:text-emerald-400">
                        {formatFcfa(row.paye)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[var(--sgi-red)]">
                        {formatFcfa(reste)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[var(--sgi-gold)]">
                        {formatFcfa(surplus)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function QuotaCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint: string;
  tone: "red" | "gold" | "blue" | "green";
}) {
  const toneClass = {
    red: "text-[var(--sgi-red)] bg-[var(--sgi-red)]/10",
    gold: "text-[var(--sgi-gold)] bg-[var(--sgi-gold)]/15",
    blue: "text-[var(--sgi-blue)] bg-[var(--sgi-blue)]/10",
    green: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/12",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3.5">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon size={14} />
      </div>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className="mt-0.5 font-display text-lg font-bold text-foreground"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
