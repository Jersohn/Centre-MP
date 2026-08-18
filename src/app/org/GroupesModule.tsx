import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2, UsersRound } from "lucide-react";
import {
  createGroupe,
  deleteGroupe,
  listChapitres,
  listDistricts,
  listGroupes,
  updateGroupe,
} from "../../services/orgService";
import type { ChapitreRow, DistrictRow, GroupeRow } from "../../types/supabase";
import type { MemberRecord } from "../memberFormUtils";
import { OrgMemberRows } from "../MemberBulkSelect";
import type { PlatformRole } from "../roles";
import { useOpsData } from "../opsDataStore";
import { RowActionsMenu } from "../RowActionsMenu";
import { useConfirm } from "../ConfirmDialog";
import { membersOfGroupe, OrgMemberDetailModal } from "./OrgMemberDetailModal";
import { OrgDetailEmpty, OrgEmptyState, OrgPageShell } from "./OrgPageShell";
import { sortByLabel } from "../sortUtils";

type Level = "groupes" | "membres";

export default function GroupesModule({ role }: { role: PlatformRole }) {
  const { confirm } = useConfirm();
  const { members } = useOpsData();
  const [items, setItems] = useState<GroupeRow[]>([]);
  const [chapitres, setChapitres] = useState<ChapitreRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [level, setLevel] = useState<Level>("groupes");
  const [groupeId, setGroupeId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [query, setQuery] = useState("");
  const [chapitreFilter, setChapitreFilter] = useState<"all" | string>("all");
  const [districtFilter, setDistrictFilter] = useState<"all" | string>("all");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GroupeRow | null>(null);
  const [name, setName] = useState("");
  const [chapitreId, setChapitreId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedGroupe = items.find((item) => item.id === groupeId) || null;

  const load = async () => {
    setLoading(true);
    const [groupesRes, chapitresRes, districtsRes] = await Promise.all([
      listGroupes(),
      listChapitres(),
      listDistricts(),
    ]);
    if (groupesRes.error) {
      setToast(groupesRes.error.message);
      setItems([]);
    } else {
      setItems(sortByLabel(groupesRes.data, (item) => item.name));
    }
    if (!chapitresRes.error) setChapitres(sortByLabel(chapitresRes.data, (item) => item.name));
    if (!districtsRes.error) setDistricts(sortByLabel(districtsRes.data, (item) => item.name));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const districtsForFilter = useMemo(() => {
    const list =
      chapitreFilter === "all"
        ? districts
        : districts.filter((item) => item.chapitre_id === chapitreFilter);
    return sortByLabel(list, (item) => item.name);
  }, [districts, chapitreFilter]);

  const districtsForForm = useMemo(
    () =>
      sortByLabel(
        districts.filter((item) => item.chapitre_id === chapitreId),
        (item) => item.name,
      ),
    [districts, chapitreId],
  );

  const memberCountByGroupe = useMemo(() => {
    const map = new Map<string, number>();
    for (const groupe of items) {
      map.set(groupe.id, membersOfGroupe(members, groupe).length);
    }
    return map;
  }, [items, members]);

  const membersList = useMemo(() => {
    if (!selectedGroupe) return [];
    return membersOfGroupe(
      members,
      selectedGroupe,
      selectedGroupe.district_name,
      selectedGroupe.chapitre_name,
    );
  }, [members, selectedGroupe]);

  const visibleGroupes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortByLabel(
      items.filter((item) => {
        if (chapitreFilter !== "all" && item.chapitre_id !== chapitreFilter) return false;
        if (districtFilter !== "all" && item.district_id !== districtFilter) return false;
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          (item.district_name || "").toLowerCase().includes(q) ||
          (item.chapitre_name || "").toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q)
        );
      }),
      (item) => item.name,
    );
  }, [items, query, chapitreFilter, districtFilter]);

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return membersList;
    return membersList.filter((member) =>
      `${member.prenom} ${member.nom} ${member.email}`.toLowerCase().includes(q),
    );
  }, [membersList, query]);

  const openCreate = () => {
    const firstChapitre = chapitres[0]?.id || "";
    const firstDistrict =
      districts.find((item) => item.chapitre_id === firstChapitre)?.id || districts[0]?.id || "";
    setEditing(null);
    setName("");
    setChapitreId(firstChapitre);
    setDistrictId(firstDistrict);
    setSortOrder(items.length);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: GroupeRow) => {
    setEditing(item);
    setName(item.name);
    setChapitreId(item.chapitre_id || "");
    setDistrictId(item.district_id);
    setSortOrder(item.sort_order || 0);
    setError(null);
    setModalOpen(true);
  };

  const onChapitreFormChange = (value: string) => {
    setChapitreId(value);
    const nextDistrict = districts.find((item) => item.chapitre_id === value)?.id || "";
    setDistrictId(nextDistrict);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const { data, error: saveError } = await updateGroupe(editing.id, {
          name,
          district_id: districtId,
          sort_order: sortOrder,
        });
        if (saveError || !data) throw saveError || new Error("Mise à jour impossible.");
        setToast(`Groupe « ${data.name} » mis à jour.`);
      } else {
        const { data, error: saveError } = await createGroupe({
          name,
          district_id: districtId,
          sort_order: sortOrder,
        });
        if (saveError || !data) throw saveError || new Error("Création impossible.");
        setToast(`Groupe « ${data.name} » créé.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: GroupeRow) => {
    const ok = await confirm({
      title: "Supprimer ce groupe ?",
      description: `« ${item.name} »\nImpossible s’il reste des membres ou collectes rattachés.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    const { error: deleteError } = await deleteGroupe(item.id);
    if (deleteError) {
      setToast(deleteError.message);
      return;
    }
    setToast(`Groupe « ${item.name} » supprimé.`);
    if (groupeId === item.id) {
      setLevel("groupes");
      setGroupeId(null);
    }
    await load();
  };

  const openGroupe = (id: string) => {
    setGroupeId(id);
    setQuery("");
    setLevel("membres");
  };

  const goBack = () => {
    setQuery("");
    setLevel("groupes");
    setGroupeId(null);
  };

  const detailPanel = selectedGroupe ? (
    <div className="flex h-full flex-col">
      <div
        className="border-b border-border px-5 py-5"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--sgi-blue) 10%, transparent), transparent)",
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-gold)]">Groupe</p>
        <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{selectedGroupe.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {selectedGroupe.district_name || "District"} · {selectedGroupe.chapitre_name || "Chapitre"}
        </p>
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Membres</p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">{membersList.length}</p>
        </div>
        {level === "membres" ? (
          <p className="text-sm text-muted-foreground">
            Cliquez sur un membre dans la liste pour afficher sa fiche détaillée.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cliquez sur le groupe pour voir la liste de ses membres.
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => openEdit(selectedGroupe)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white"
          >
            <Pencil size={15} /> Modifier
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(selectedGroupe)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 size={15} /> Supprimer
          </button>
        </div>
      </div>
    </div>
  ) : (
    <OrgDetailEmpty label="Cliquez sur un groupe pour voir ses membres." />
  );

  const listContent = (() => {
    if (level === "membres") {
      if (visibleMembers.length === 0) {
        return <OrgEmptyState label={loading ? "Chargement…" : "Aucun membre dans ce groupe."} />;
      }
      return (
        <OrgMemberRows
          members={visibleMembers}
          role={role}
          onOpen={setSelectedMember}
          onToast={setToast}
        />
      );
    }

    if (visibleGroupes.length === 0) {
      return (
        <OrgEmptyState
          label={loading ? "Chargement…" : items.length === 0 ? "Aucun groupe." : "Aucun résultat."}
        />
      );
    }

    return visibleGroupes.map((item, index) => (
      <div
        key={item.id}
        className="flex items-center gap-3 rounded-2xl border border-transparent bg-muted/25 px-4 py-4 transition hover:border-border hover:bg-muted/50"
      >
        <button type="button" onClick={() => openGroupe(item.id)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-[var(--sgi-blue)]/10 px-1.5 text-[11px] font-bold text-[var(--sgi-blue)]">
              {index + 1}
            </span>
            <span className="truncate font-semibold text-foreground">{item.name}</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {item.chapitre_name || "—"} · {item.district_name || "—"} ·{" "}
            {memberCountByGroupe.get(item.id) || 0} membre
            {(memberCountByGroupe.get(item.id) || 0) > 1 ? "s" : ""}
          </div>
        </button>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        <RowActionsMenu
          actions={[
            { label: "Modifier", icon: <Pencil size={14} />, onClick: () => openEdit(item) },
            {
              label: "Supprimer",
              icon: <Trash2 size={14} />,
              tone: "danger",
              onClick: () => void handleDelete(item),
            },
          ]}
        />
      </div>
    ));
  })();

  return (
    <>
      <OrgPageShell
        title="Gestion des groupes"
        subtitle="Cliquez un groupe pour voir ses membres, puis la fiche détaillée."
        icon={UsersRound}
        kpis={[
          { label: "Groupes", value: items.length, tone: "text-[var(--sgi-blue)]" },
          { label: "Districts", value: districts.length, tone: "text-[var(--sgi-gold)]" },
          { label: "Membres", value: members.length, tone: "text-emerald-600" },
          { label: "Affichés", value: visibleGroupes.length, tone: "text-muted-foreground" },
        ]}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={level === "membres" ? "Rechercher un membre…" : "Rechercher un groupe…"}
        filters={
          <div className="space-y-2">
            {level === "membres" && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <ChevronLeft size={14} /> Retour aux groupes
              </button>
            )}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={goBack}
                className={`rounded-lg px-2 py-1 font-medium transition ${
                  level === "groupes"
                    ? "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]"
                    : "hover:bg-muted hover:text-foreground"
                }`}
              >
                Groupes
              </button>
              {selectedGroupe && (
                <>
                  <ChevronRight size={12} />
                  <span className="max-w-[12rem] truncate rounded-lg bg-[var(--sgi-blue)]/10 px-2 py-1 font-medium text-[var(--sgi-blue)]">
                    {selectedGroupe.name}
                  </span>
                </>
              )}
            </div>
            {level === "groupes" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={chapitreFilter}
                  onChange={(e) => {
                    setChapitreFilter(e.target.value);
                    setDistrictFilter("all");
                  }}
                  className="rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
                >
                  <option value="all">Tous les chapitres</option>
                  {chapitres.map((chapitre) => (
                    <option key={chapitre.id} value={chapitre.id}>
                      {chapitre.name}
                    </option>
                  ))}
                </select>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
                >
                  <option value="all">Tous les districts</option>
                  {districtsForFilter.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        }
        onRefresh={() => void load()}
        loading={loading}
        onCreate={openCreate}
        createLabel="Nouveau groupe"
        toast={toast}
        detail={detailPanel}
      >
        {listContent}
      </OrgPageShell>

      {selectedMember && (
        <OrgMemberDetailModal membre={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/40 p-4 sm:items-center"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-display text-base font-semibold text-foreground">
                {editing ? "Modifier le groupe" : "Nouveau groupe"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Nom</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none focus:border-[var(--sgi-blue)]"
                  placeholder="Ex. VICTOIRE"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Chapitre</span>
                <select
                  required
                  value={chapitreId}
                  onChange={(e) => onChapitreFormChange(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none"
                >
                  {chapitres.map((chapitre) => (
                    <option key={chapitre.id} value={chapitre.id}>
                      {chapitre.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">District</span>
                <select
                  required
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none"
                >
                  {districtsForForm.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Ordre d’affichage</span>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none"
                />
              </label>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !districtId}
                  className="rounded-xl bg-[var(--sgi-blue)] px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
