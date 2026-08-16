import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPinned,
  Pencil,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  createDistrict,
  deleteDistrict,
  listChapitres,
  listDistricts,
  listGroupes,
  updateDistrict,
} from "../../services/orgService";
import type { ChapitreRow, DistrictRow, GroupeRow } from "../../types/supabase";
import { MemberAvatar } from "../MemberAvatar";
import type { MemberRecord } from "../memberFormUtils";
import { useOpsData } from "../opsDataStore";
import { RowActionsMenu } from "../RowActionsMenu";
import { useConfirm } from "../ConfirmDialog";
import { membersOfGroupe, OrgMemberDetailModal } from "./OrgMemberDetailModal";
import { OrgDetailEmpty, OrgEmptyState, OrgPageShell } from "./OrgPageShell";
import { sortByLabel } from "../sortUtils";

type Level = "districts" | "groupes" | "membres";

export default function DistrictsModule() {
  const { confirm } = useConfirm();
  const { members } = useOpsData();
  const [items, setItems] = useState<DistrictRow[]>([]);
  const [chapitres, setChapitres] = useState<ChapitreRow[]>([]);
  const [groupes, setGroupes] = useState<GroupeRow[]>([]);
  const [level, setLevel] = useState<Level>("districts");
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [groupeId, setGroupeId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [query, setQuery] = useState("");
  const [chapitreFilter, setChapitreFilter] = useState<"all" | string>("all");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DistrictRow | null>(null);
  const [name, setName] = useState("");
  const [chapitreId, setChapitreId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDistrict = items.find((item) => item.id === districtId) || null;
  const selectedGroupe = groupes.find((item) => item.id === groupeId) || null;

  const load = async () => {
    setLoading(true);
    const [districtsRes, chapitresRes, groupesRes] = await Promise.all([
      listDistricts(),
      listChapitres(),
      listGroupes(),
    ]);
    if (districtsRes.error) {
      setToast(districtsRes.error.message);
      setItems([]);
    } else {
      setItems(sortByLabel(districtsRes.data, (item) => item.name));
    }
    if (!chapitresRes.error) setChapitres(sortByLabel(chapitresRes.data, (item) => item.name));
    if (!groupesRes.error) setGroupes(sortByLabel(groupesRes.data, (item) => item.name));
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

  const groupesOfDistrict = useMemo(
    () => sortByLabel(
      groupes.filter((item) => item.district_id === districtId),
      (item) => item.name,
    ),
    [groupes, districtId],
  );

  const membersList = useMemo(() => {
    if (!selectedGroupe) return [];
    return membersOfGroupe(
      members,
      selectedGroupe,
      selectedDistrict?.name,
      selectedDistrict?.chapitre_name,
    );
  }, [members, selectedGroupe, selectedDistrict]);

  const memberCountByGroupe = useMemo(() => {
    const map = new Map<string, number>();
    for (const groupe of groupes) {
      map.set(groupe.id, membersOfGroupe(members, groupe).length);
    }
    return map;
  }, [groupes, members]);

  const visibleDistricts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortByLabel(
      items.filter((item) => {
        if (chapitreFilter !== "all" && item.chapitre_id !== chapitreFilter) return false;
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          (item.chapitre_name || "").toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q)
        );
      }),
      (item) => item.name,
    );
  }, [items, query, chapitreFilter]);

  const visibleGroupes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groupesOfDistrict;
    return groupesOfDistrict.filter((item) => item.name.toLowerCase().includes(q));
  }, [groupesOfDistrict, query]);

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return membersList;
    return membersList.filter((member) =>
      `${member.prenom} ${member.nom} ${member.email}`.toLowerCase().includes(q),
    );
  }, [membersList, query]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setChapitreId(chapitres[0]?.id || "");
    setSortOrder(items.length);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: DistrictRow) => {
    setEditing(item);
    setName(item.name);
    setChapitreId(item.chapitre_id);
    setSortOrder(item.sort_order || 0);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const { data, error: saveError } = await updateDistrict(editing.id, {
          name,
          chapitre_id: chapitreId,
          sort_order: sortOrder,
        });
        if (saveError || !data) throw saveError || new Error("Mise à jour impossible.");
        setToast(`District « ${data.name} » mis à jour.`);
      } else {
        const { data, error: saveError } = await createDistrict({
          name,
          chapitre_id: chapitreId,
          sort_order: sortOrder,
        });
        if (saveError || !data) throw saveError || new Error("Création impossible.");
        setToast(`District « ${data.name} » créé.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: DistrictRow) => {
    const ok = await confirm({
      title: "Supprimer ce district ?",
      description: `« ${item.name} »\nSes groupes seront aussi supprimés s’ils n’ont pas de membres rattachés.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    const { error: deleteError } = await deleteDistrict(item.id);
    if (deleteError) {
      setToast(deleteError.message);
      return;
    }
    setToast(`District « ${item.name} » supprimé.`);
    if (districtId === item.id) {
      setLevel("districts");
      setDistrictId(null);
      setGroupeId(null);
    }
    await load();
  };

  const goBack = () => {
    setQuery("");
    if (level === "membres") {
      setLevel("groupes");
      setGroupeId(null);
      return;
    }
    if (level === "groupes") {
      setLevel("districts");
      setDistrictId(null);
    }
  };

  const openDistrict = (id: string) => {
    setDistrictId(id);
    setGroupeId(null);
    setQuery("");
    setLevel("groupes");
  };

  const openGroupe = (id: string) => {
    setGroupeId(id);
    setQuery("");
    setLevel("membres");
  };

  const searchPlaceholder =
    level === "districts"
      ? "Rechercher un district…"
      : level === "groupes"
        ? "Rechercher un groupe…"
        : "Rechercher un membre…";

  const breadcrumb = (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => {
          setLevel("districts");
          setDistrictId(null);
          setGroupeId(null);
          setQuery("");
        }}
        className={`rounded-lg px-2 py-1 font-medium transition ${
          level === "districts"
            ? "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]"
            : "hover:bg-muted hover:text-foreground"
        }`}
      >
        Districts
      </button>
      {selectedDistrict && (
        <>
          <ChevronRight size={12} />
          <button
            type="button"
            onClick={() => {
              setLevel("groupes");
              setGroupeId(null);
              setQuery("");
            }}
            className={`max-w-[10rem] truncate rounded-lg px-2 py-1 font-medium transition ${
              level === "groupes"
                ? "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]"
                : "hover:bg-muted hover:text-foreground"
            }`}
          >
            {selectedDistrict.name}
          </button>
        </>
      )}
      {selectedGroupe && (
        <>
          <ChevronRight size={12} />
          <span className="max-w-[10rem] truncate rounded-lg bg-[var(--sgi-blue)]/10 px-2 py-1 font-medium text-[var(--sgi-blue)]">
            {selectedGroupe.name}
          </span>
        </>
      )}
    </div>
  );

  const detailPanel = (() => {
    if (level === "membres" && selectedGroupe) {
      return (
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
              {[selectedDistrict?.name, selectedDistrict?.chapitre_name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Membres</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{membersList.length}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Cliquez sur un membre dans la liste pour afficher sa fiche détaillée.
            </p>
          </div>
        </div>
      );
    }
    if (level === "groupes" && selectedDistrict) {
      return (
        <div className="flex h-full flex-col">
          <div
            className="border-b border-border px-5 py-5"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--sgi-gold) 12%, transparent), transparent)",
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-gold)]">District</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{selectedDistrict.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedDistrict.chapitre_name || "Chapitre non renseigné"}
            </p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Groupes</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {groupesOfDistrict.length}
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => openEdit(selectedDistrict)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white"
              >
                <Pencil size={15} /> Modifier
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(selectedDistrict)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 size={15} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <OrgDetailEmpty label="Cliquez sur un district pour voir ses groupes, puis ses membres." />
    );
  })();

  const listContent = (() => {
    if (level === "groupes") {
      if (visibleGroupes.length === 0) {
        return <OrgEmptyState label={loading ? "Chargement…" : "Aucun groupe dans ce district."} />;
      }
      return visibleGroupes.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => openGroupe(item.id)}
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-muted/25 px-4 py-4 text-left transition hover:border-border hover:bg-muted/50"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
            <UsersRound size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-foreground">{item.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {memberCountByGroupe.get(item.id) || 0} membre
              {(memberCountByGroupe.get(item.id) || 0) > 1 ? "s" : ""}
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </button>
      ));
    }

    if (level === "membres") {
      if (visibleMembers.length === 0) {
        return <OrgEmptyState label={loading ? "Chargement…" : "Aucun membre dans ce groupe."} />;
      }
      return visibleMembers.map((member) => (
        <button
          key={member.id}
          type="button"
          onClick={() => setSelectedMember(member)}
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-muted/25 px-4 py-4 text-left transition hover:border-border hover:bg-muted/50"
        >
          <MemberAvatar photo={member.photo} prenom={member.prenom} nom={member.nom} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-foreground">
              {member.prenom} {member.nom}
            </div>
            <div className="mt-1 truncate text-sm text-muted-foreground">
              {member.responsabilite === "Membre" ? "Membre simple" : member.responsabilite}
              {" · "}
              {member.statut}
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </button>
      ));
    }

    if (visibleDistricts.length === 0) {
      return (
        <OrgEmptyState
          label={loading ? "Chargement…" : items.length === 0 ? "Aucun district." : "Aucun résultat."}
        />
      );
    }

    return visibleDistricts.map((item) => (
      <div
        key={item.id}
        className="flex items-center gap-3 rounded-2xl border border-transparent bg-muted/25 px-4 py-4 transition hover:border-border hover:bg-muted/50"
      >
        <button type="button" onClick={() => openDistrict(item.id)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]">
              <MapPinned size={16} />
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground">{item.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {item.chapitre_name || "—"} · {item.groupes_count || 0} groupe
                {(item.groupes_count || 0) > 1 ? "s" : ""}
              </div>
            </div>
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
        title="Gestion des districts"
        subtitle="Explorez chaque district : groupes, puis membres."
        icon={MapPinned}
        kpis={[
          { label: "Districts", value: items.length, tone: "text-[var(--sgi-blue)]" },
          { label: "Chapitres", value: chapitres.length, tone: "text-[var(--sgi-gold)]" },
          {
            label: "Groupes",
            value: items.reduce((sum, item) => sum + (item.groupes_count || 0), 0),
            tone: "text-emerald-600",
          },
          { label: "Membres", value: members.length, tone: "text-muted-foreground" },
        ]}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={searchPlaceholder}
        filters={
          <div className="space-y-2">
            {level !== "districts" && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <ChevronLeft size={14} /> Retour
              </button>
            )}
            {breadcrumb}
            {level === "districts" && (
              <select
                value={chapitreFilter}
                onChange={(e) => setChapitreFilter(e.target.value)}
                className="w-full rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
              >
                <option value="all">Tous les chapitres</option>
                {chapitres.map((chapitre) => (
                  <option key={chapitre.id} value={chapitre.id}>
                    {chapitre.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
        onRefresh={() => void load()}
        loading={loading}
        onCreate={openCreate}
        createLabel="Nouveau district"
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
                {editing ? "Modifier le district" : "Nouveau district"}
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
                  placeholder="Ex. District Victoire"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Chapitre</span>
                <select
                  required
                  value={chapitreId}
                  onChange={(e) => setChapitreId(e.target.value)}
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
                  disabled={saving || !chapitreId}
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
