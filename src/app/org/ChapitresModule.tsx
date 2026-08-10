import { FormEvent, useEffect, useMemo, useState } from "react";
import { Layers3, Pencil, Trash2 } from "lucide-react";
import {
  createChapitre,
  deleteChapitre,
  listChapitres,
  updateChapitre,
} from "../../services/orgService";
import type { ChapitreRow } from "../../types/supabase";
import { RowActionsMenu } from "../RowActionsMenu";
import { useConfirm } from "../ConfirmDialog";
import { OrgDetailEmpty, OrgEmptyState, OrgPageShell } from "./OrgPageShell";

export default function ChapitresModule() {
  const { confirm } = useConfirm();
  const [items, setItems] = useState<ChapitreRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected = items.find((item) => item.id === selectedId) || null;

  const load = async () => {
    setLoading(true);
    const { data, error: loadError } = await listChapitres();
    if (loadError) {
      setToast(loadError.message);
      setItems([]);
    } else {
      setItems(data);
      setSelectedId((current) => current || data[0]?.id || null);
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q),
    );
  }, [items, query]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setSortOrder(items.length);
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
        setSelectedId(data.id);
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
    if (selectedId === item.id) setSelectedId(null);
    await load();
  };

  return (
    <>
      <OrgPageShell
        title="Gestion des chapitres"
        subtitle="Structurez les 3 chapitres du Centre Miroir Parfait et suivez leurs districts et groupes."
        icon={Layers3}
        kpis={[
          { label: "Chapitres", value: items.length, tone: "text-[var(--sgi-blue)]" },
          {
            label: "Districts",
            value: items.reduce((sum, item) => sum + (item.districts_count || 0), 0),
            tone: "text-[var(--sgi-gold)]",
          },
          {
            label: "Groupes",
            value: items.reduce((sum, item) => sum + (item.groupes_count || 0), 0),
            tone: "text-emerald-600",
          },
          {
            label: "Sélection",
            value: selected?.name ? 1 : 0,
            tone: "text-muted-foreground",
          },
        ]}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Rechercher un chapitre…"
        onRefresh={() => void load()}
        loading={loading}
        onCreate={openCreate}
        createLabel="Nouveau chapitre"
        toast={toast}
        detail={
          selected ? (
            <div className="flex h-full flex-col">
              <div
                className="border-b border-border px-5 py-5"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--sgi-blue) 10%, transparent), transparent)",
                }}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-gold)]">Chapitre</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{selected.name}</h3>
              </div>
              <div className="space-y-4 px-5 py-5">
                <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="mt-1 text-sm text-foreground">
                    {selected.description?.trim() || "Aucune description."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Districts</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                      {selected.districts_count || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Groupes</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                      {selected.groupes_count || 0}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-medium text-white"
                  >
                    <Pencil size={15} /> Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(selected)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={15} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <OrgDetailEmpty label="Aucun chapitre sélectionné" />
          )
        }
      >
        {visible.length === 0 ? (
          <OrgEmptyState label={loading ? "Chargement…" : items.length === 0 ? "Aucun chapitre." : "Aucun résultat."} />
        ) : (
          visible.map((item) => {
            const active = selectedId === item.id;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                  active
                    ? "border-[var(--sgi-blue)]/35 bg-[var(--sgi-blue)]/5 shadow-sm"
                    : "border-transparent bg-muted/25 hover:border-border hover:bg-muted/50"
                }`}
              >
                <button type="button" onClick={() => setSelectedId(item.id)} className="min-w-0 flex-1 text-left">
                  <div className="truncate font-semibold text-foreground">{item.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.districts_count || 0} districts · {item.groupes_count || 0} groupes
                  </div>
                </button>
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
            );
          })
        )}
      </OrgPageShell>

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
