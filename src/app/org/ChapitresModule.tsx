import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers3,
  MapPinned,
  Pencil,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  createChapitre,
  deleteChapitre,
  listChapitres,
  listDistricts,
  listGroupes,
  updateChapitre,
} from "../../services/orgService";
import type { ChapitreRow, DistrictRow, GroupeRow } from "../../types/supabase";
import { MemberAvatar } from "../MemberAvatar";
import type { MemberRecord } from "../memberFormUtils";
import { useOpsData } from "../opsDataStore";
import { RowActionsMenu } from "../RowActionsMenu";
import { useConfirm } from "../ConfirmDialog";
import { membersOfGroupe, OrgMemberDetailModal } from "./OrgMemberDetailModal";
import { OrgDetailEmpty, OrgEmptyState, OrgPageShell } from "./OrgPageShell";

type Level = "chapitres" | "districts" | "groupes" | "membres";

export default function ChapitresModule() {
  const { confirm } = useConfirm();
  const { members } = useOpsData();
  const [chapitres, setChapitres] = useState<ChapitreRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [groupes, setGroupes] = useState<GroupeRow[]>([]);
  const [level, setLevel] = useState<Level>("chapitres");
  const [chapitreId, setChapitreId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [groupeId, setGroupeId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChapitreRow | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedChapitre = chapitres.find((item) => item.id === chapitreId) || null;
  const selectedDistrict = districts.find((item) => item.id === districtId) || null;
  const selectedGroupe = groupes.find((item) => item.id === groupeId) || null;

  const load = async () => {
    setLoading(true);
    const [chapRes, distRes, grpRes] = await Promise.all([
      listChapitres(),
      listDistricts(),
      listGroupes(),
    ]);
    if (chapRes.error || distRes.error || grpRes.error) {
      setToast(
        chapRes.error?.message ||
          distRes.error?.message ||
          grpRes.error?.message ||
          "Impossible de charger l’organisation.",
      );
      setChapitres([]);
      setDistricts([]);
      setGroupes([]);
    } else {
      setChapitres(chapRes.data);
      setDistricts(distRes.data);
      setGroupes(grpRes.data);
    }
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

  const districtsOfChapitre = useMemo(
    () => districts.filter((item) => item.chapitre_id === chapitreId),
    [districts, chapitreId],
  );

  const groupesOfDistrict = useMemo(
    () => groupes.filter((item) => item.district_id === districtId),
    [groupes, districtId],
  );

  const membersOfGroupeList = useMemo(() => {
    if (!selectedGroupe) return [];
    return membersOfGroupe(
      members,
      selectedGroupe,
      selectedDistrict?.name,
      selectedChapitre?.name,
    );
  }, [members, selectedGroupe, selectedDistrict, selectedChapitre]);

  const memberCountByGroupe = useMemo(() => {
    const map = new Map<string, number>();
    for (const groupe of groupes) {
      map.set(groupe.id, membersOfGroupe(members, groupe).length);
    }
    return map;
  }, [groupes, members]);

  const visibleChapitres = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapitres;
    return chapitres.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }, [chapitres, query]);

  const visibleDistricts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return districtsOfChapitre;
    return districtsOfChapitre.filter((item) => item.name.toLowerCase().includes(q));
  }, [districtsOfChapitre, query]);

  const visibleGroupes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groupesOfDistrict;
    return groupesOfDistrict.filter((item) => item.name.toLowerCase().includes(q));
  }, [groupesOfDistrict, query]);

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return membersOfGroupeList;
    return membersOfGroupeList.filter((member) =>
      `${member.prenom} ${member.nom} ${member.email}`.toLowerCase().includes(q),
    );
  }, [membersOfGroupeList, query]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setSortOrder(chapitres.length);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (item: ChapitreRow) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || "");
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
        const { data, error: saveError } = await updateChapitre(editing.id, {
          name,
          description,
          sort_order: sortOrder,
        });
        if (saveError || !data) throw saveError || new Error("Mise à jour impossible.");
        setToast(`Chapitre « ${data.name} » mis à jour.`);
      } else {
        const { data, error: saveError } = await createChapitre({
          name,
          description,
          sort_order: sortOrder,
        });
        if (saveError || !data) throw saveError || new Error("Création impossible.");
        setToast(`Chapitre « ${data.name} » créé.`);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ChapitreRow) => {
    const ok = await confirm({
      title: "Supprimer ce chapitre ?",
      description: `« ${item.name} »\nSes districts et groupes seront aussi supprimés s’ils n’ont pas de membres rattachés.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    const { error: deleteError } = await deleteChapitre(item.id);
    if (deleteError) {
      setToast(deleteError.message);
      return;
    }
    setToast(`Chapitre « ${item.name} » supprimé.`);
    if (chapitreId === item.id) {
      setLevel("chapitres");
      setChapitreId(null);
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
      return;
    }
    if (level === "districts") {
      setLevel("chapitres");
      setChapitreId(null);
    }
  };

  const openChapitre = (id: string) => {
    setChapitreId(id);
    setDistrictId(null);
    setGroupeId(null);
    setQuery("");
    setLevel("districts");
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
    level === "chapitres"
      ? "Rechercher un chapitre…"
      : level === "districts"
        ? "Rechercher un district…"
        : level === "groupes"
          ? "Rechercher un groupe…"
          : "Rechercher un membre…";

  const breadcrumb = (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => {
          setLevel("chapitres");
          setChapitreId(null);
          setDistrictId(null);
          setGroupeId(null);
          setQuery("");
        }}
        className={`rounded-lg px-2 py-1 font-medium transition ${
          level === "chapitres" ? "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]" : "hover:bg-muted hover:text-foreground"
        }`}
      >
        Chapitres
      </button>
      {selectedChapitre && (
        <>
          <ChevronRight size={12} />
          <button
            type="button"
            onClick={() => {
              setLevel("districts");
              setDistrictId(null);
              setGroupeId(null);
              setQuery("");
            }}
            className={`max-w-[10rem] truncate rounded-lg px-2 py-1 font-medium transition ${
              level === "districts" ? "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]" : "hover:bg-muted hover:text-foreground"
            }`}
          >
            {selectedChapitre.name}
          </button>
        </>
      )}
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
              level === "groupes" ? "bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]" : "hover:bg-muted hover:text-foreground"
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
              {[selectedDistrict?.name, selectedChapitre?.name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Membres</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {membersOfGroupeList.length}
              </p>
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
            <p className="mt-1 text-sm text-muted-foreground">{selectedChapitre?.name}</p>
          </div>
          <div className="space-y-3 px-5 py-5">
            <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Groupes</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {groupesOfDistrict.length}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Cliquez sur un groupe pour voir la liste de ses membres.
            </p>
          </div>
        </div>
      );
    }
    if (level === "districts" && selectedChapitre) {
      return (
        <div className="flex h-full flex-col">
          <div
            className="border-b border-border px-5 py-5"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--sgi-blue) 10%, transparent), transparent)",
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-gold)]">Chapitre</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{selectedChapitre.name}</h3>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 text-sm text-foreground">
                {selectedChapitre.description?.trim() || "Aucune description."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Districts</p>
                <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                  {districtsOfChapitre.length}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Groupes</p>
                <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                  {selectedChapitre.groupes_count || 0}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => openEdit(selectedChapitre)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white"
              >
                <Pencil size={15} /> Modifier
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(selectedChapitre)}
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
      <OrgDetailEmpty label="Cliquez sur un chapitre pour explorer ses districts, groupes et membres." />
    );
  })();

  const listContent = (() => {
    if (level === "districts") {
      if (visibleDistricts.length === 0) {
        return (
          <OrgEmptyState
            label={loading ? "Chargement…" : "Aucun district dans ce chapitre."}
          />
        );
      }
      return visibleDistricts.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => openDistrict(item.id)}
          className="flex w-full items-center gap-3 rounded-2xl border border-transparent bg-muted/25 px-4 py-4 text-left transition hover:border-border hover:bg-muted/50"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]">
            <MapPinned size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-foreground">{item.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {item.groupes_count || 0} groupe{(item.groupes_count || 0) > 1 ? "s" : ""}
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </button>
      ));
    }

    if (level === "groupes") {
      if (visibleGroupes.length === 0) {
        return (
          <OrgEmptyState label={loading ? "Chargement…" : "Aucun groupe dans ce district."} />
        );
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
        return (
          <OrgEmptyState label={loading ? "Chargement…" : "Aucun membre dans ce groupe."} />
        );
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

    if (visibleChapitres.length === 0) {
      return (
        <OrgEmptyState
          label={loading ? "Chargement…" : chapitres.length === 0 ? "Aucun chapitre." : "Aucun résultat."}
        />
      );
    }

    return visibleChapitres.map((item) => (
      <div
        key={item.id}
        className="flex items-center gap-3 rounded-2xl border border-transparent bg-muted/25 px-4 py-4 transition hover:border-border hover:bg-muted/50"
      >
        <button type="button" onClick={() => openChapitre(item.id)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]">
              <Layers3 size={16} />
            </span>
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground">{item.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {item.districts_count || 0} district{(item.districts_count || 0) > 1 ? "s" : ""} ·{" "}
                {item.groupes_count || 0} groupe{(item.groupes_count || 0) > 1 ? "s" : ""}
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
        title="Gestion des chapitres"
        subtitle="Explorez l’organisation : chapitre → districts → groupes → membres."
        icon={Layers3}
        kpis={[
          { label: "Chapitres", value: chapitres.length, tone: "text-[var(--sgi-blue)]" },
          {
            label: "Districts",
            value: districts.length,
            tone: "text-[var(--sgi-gold)]",
          },
          {
            label: "Groupes",
            value: groupes.length,
            tone: "text-emerald-600",
          },
          {
            label: "Membres",
            value: members.length,
            tone: "text-muted-foreground",
          },
        ]}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={searchPlaceholder}
        filters={
          <div className="space-y-2">
            {level !== "chapitres" && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <ChevronLeft size={14} /> Retour
              </button>
            )}
            {breadcrumb}
          </div>
        }
        onRefresh={() => void load()}
        loading={loading}
        onCreate={openCreate}
        createLabel="Nouveau chapitre"
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
                {editing ? "Modifier le chapitre" : "Nouveau chapitre"}
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
                  placeholder="Ex. Rissho Ankoku Ron"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm outline-none focus:border-[var(--sgi-blue)]"
                  placeholder="Présentation courte du chapitre"
                />
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
                  disabled={saving}
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
