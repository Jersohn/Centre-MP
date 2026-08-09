import { FormEvent, useEffect, useMemo, useState } from "react";
import { MapPinned, Pencil, Trash2 } from "lucide-react";
import {
  createDistrict,
  deleteDistrict,
  listChapitres,
  listDistricts,
  updateDistrict,
} from "../../services/orgService";
import type { ChapitreRow, DistrictRow } from "../../types/supabase";
import { RowActionsMenu } from "../RowActionsMenu";
import { OrgDetailEmpty, OrgEmptyState, OrgPageShell } from "./OrgPageShell";

export default function DistrictsModule() {
  const [items, setItems] = useState<DistrictRow[]>([]);
  const [chapitres, setChapitres] = useState<ChapitreRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selected = items.find((item) => item.id === selectedId) || null;

  const load = async () => {
    setLoading(true);
    const [districtsRes, chapitresRes] = await Promise.all([listDistricts(), listChapitres()]);
    if (districtsRes.error) {
      setToast(districtsRes.error.message);
      setItems([]);
    } else {
      setItems(districtsRes.data);
      setSelectedId((current) => current || districtsRes.data[0]?.id || null);
    }
    if (!chapitresRes.error) setChapitres(chapitresRes.data);
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
    return items.filter((item) => {
      if (chapitreFilter !== "all" && item.chapitre_id !== chapitreFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.chapitre_name || "").toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q)
      );
    });
  }, [items, query, chapitreFilter]);

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

  const handleDelete = async (item: DistrictRow) => {
    const ok = window.confirm(
      `Supprimer le district « ${item.name} » ? Ses groupes seront aussi supprimés s’ils n’ont pas de membres rattachés.`,
    );
    if (!ok) return;
    const { error: deleteError } = await deleteDistrict(item.id);
    if (deleteError) {
      setToast(deleteError.message);
      return;
    }
    setToast(`District « ${item.name} » supprimé.`);
    if (selectedId === item.id) setSelectedId(null);
    await load();
  };

  return (
    <>
      <OrgPageShell
        title="Gestion des districts"
        subtitle="Pilotez les 9 districts du centre, rattachés à leurs chapitres respectifs."
        icon={MapPinned}
        kpis={[
          { label: "Districts", value: items.length, tone: "text-[var(--sgi-blue)]" },
          { label: "Chapitres", value: chapitres.length, tone: "text-[var(--sgi-gold)]" },
          {
            label: "Groupes",
            value: items.reduce((sum, item) => sum + (item.groupes_count || 0), 0),
            tone: "text-emerald-600",
          },
          {
            label: "Filtrés",
            value: visible.length,
            tone: "text-muted-foreground",
          },
        ]}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Rechercher un district…"
        filters={
          <select
            value={chapitreFilter}
            onChange={(e) => setChapitreFilter(e.target.value)}
            className="rounded-2xl border border-border bg-input-background px-3.5 py-2.5 text-sm outline-none"
          >
            <option value="all">Tous les chapitres</option>
            {chapitres.map((chapitre) => (
              <option key={chapitre.id} value={chapitre.id}>
                {chapitre.name}
              </option>
            ))}
          </select>
        }
        onRefresh={() => void load()}
        loading={loading}
        onCreate={openCreate}
        createLabel="Nouveau district"
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
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sgi-gold)]">District</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{selected.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{selected.chapitre_name || "Chapitre non renseigné"}</p>
              </div>
              <div className="space-y-4 px-5 py-5">
                <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Chapitre</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{selected.chapitre_name || "—"}</p>
                </div>
                <div className="rounded-2xl border border-border bg-muted/25 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Groupes</p>
                  <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                    {selected.groupes_count || 0}
                  </p>
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
            <OrgDetailEmpty label="Aucun district sélectionné" />
          )
        }
      >
        {visible.length === 0 ? (
          <OrgEmptyState label={loading ? "Chargement…" : items.length === 0 ? "Aucun district." : "Aucun résultat."} />
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
                    {item.chapitre_name || "—"} · {item.groupes_count || 0} groupes
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
