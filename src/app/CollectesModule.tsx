import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Eye,
  Edit2,
  HeartHandshake,
  Layers3,
  MapPinned,
  Plus,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  Users,
  Wallet,
  X,
  Hash,
} from "lucide-react";
import { RowActionsMenu } from "./RowActionsMenu";
import { MemberAvatar } from "./MemberAvatar";
import { findMemberPhotoByName, memberFullName } from "./membersData";
import CollectesImportExportBar from "./CollectesImportExportBar";
import ZaimuSpecialCampaignsPanel from "./ZaimuSpecialCampaignsPanel";
import type { PlatformRole } from "./roles";
import { useOrgTree, type OrgSelectionIds } from "./useOrgTree";
import { useOpsData } from "./opsDataStore";
import type { MemberRecord } from "./memberFormUtils";
import {
  createCollecteRemote,
  deleteCollecteRemote,
  hasRemoteCollectes,
  updateCollecteRemote,
} from "../services/collecteService";
import {
  listSpecialCampaigns,
  type ZaimuCampaign,
} from "../services/quotaService";

export type CollecteTab = "vague-paix" | "zaimu-ordinaire" | "zaimu-special";
export type CollecteStatut = "En attente" | "Validé" | "Annulé";

export interface CollecteRecord {
  id: string;
  /** Référence lisible (ex. ZO-2026-001), distincte de l’UUID. */
  numero: string;
  type: CollecteTab;
  membre: string;
  montant: number;
  date: string;
  statut: CollecteStatut;
  chapitre: string;
  district: string;
  groupe: string;
  periode: string;
  motif: string;
  /** Référence du reçu (optionnelle). */
  referenceRecu: string;
  note: string;
}

function displayCollecteNumero(record: Pick<CollecteRecord, "id" | "numero">) {
  return record.numero?.trim() || record.id;
}

const STATUT_OPTIONS: CollecteStatut[] = ["En attente", "Validé", "Annulé"];
/** Statuts proposés à la création d’un paiement (pas d’annulation à l’ajout). */
const STATUT_OPTIONS_CREATE: CollecteStatut[] = ["En attente", "Validé"];

const TAB_META: Record<
  CollecteTab,
  { label: string; short: string; description: string; icon: typeof Wallet; accent: string }
> = {
  "vague-paix": {
    label: "Abonnement Vague de Paix",
    short: "Vague de Paix",
    description: "Suivi des abonnements mensuels des membres.",
    icon: BookOpen,
    accent: "var(--sgi-blue)",
  },
  "zaimu-ordinaire": {
    label: "Zaimu ordinaire",
    short: "Zaimu ordinaire",
    description: "Collecte des zaimu ordinaires des membres.",
    icon: Wallet,
    accent: "var(--sgi-gold)",
  },
  "zaimu-special": {
    label: "Zaimu spéciaux",
    short: "Zaimu spéciaux",
    description: "Campagnes spéciales, suivi des paiements et du montant restant.",
    icon: HeartHandshake,
    accent: "var(--sgi-red)",
  },
};

type PageView = "liste" | "cota" | "import-export";

/** Liste initiale vide — les collectes sont chargées depuis Supabase. */
export const COLLECTES_SEED: CollecteRecord[] = [];

const emptyForm = (
  type: CollecteTab,
  memberOptions: string[] = [],
): Omit<CollecteRecord, "id"> => ({
  numero: "",
  type,
  membre: memberOptions[0] || "",
  montant: type === "vague-paix" ? 5000 : 0,
  date: new Date().toISOString().slice(0, 10),
  statut: "En attente",
  chapitre: "",
  district: "",
  groupe: "",
  periode: type === "zaimu-special" ? "Campagne 2026" : "Août 2026",
  motif: "",
  referenceRecu: "",
  note: "",
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function StatutPill({ statut }: { statut: CollecteStatut }) {
  const styles: Record<CollecteStatut, string> = {
    Validé: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
    "En attente": "bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]",
    Annulé: "bg-[var(--sgi-red)]/12 text-[var(--sgi-red)]",
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${styles[statut]}`}>
      {statut}
    </span>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border/80 bg-background/50 p-3.5">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sgi-blue)]/8 text-[var(--sgi-blue)]">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function DetailModal({
  record,
  photo,
  onClose,
  onEdit,
  onDelete,
}: {
  record: CollecteRecord;
  photo?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = TAB_META[record.type];
  const Icon = meta.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
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
              photo={photo}
              name={record.membre}
              size="lg"
              className="shadow-md"
            />
            <div className="min-w-0 pt-0.5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/80 backdrop-blur">
                <Icon size={12} style={{ color: meta.accent }} />
                {meta.short}
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                {record.membre}
              </h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {displayCollecteNumero(record)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[var(--sgi-gold)]/25 bg-card/90 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">Montant</p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {fmt(record.montant)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">FCFA</p>
            </div>
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Statut</p>
              <div className="mt-2">
                <StatutPill statut={record.statut} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Saisi le <span className="font-semibold text-foreground">{record.date}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Informations</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailField icon={CalendarDays} label="Période / campagne" value={record.periode || "—"} />
            <DetailField
              icon={Hash}
              label="Référence du reçu"
              value={record.referenceRecu?.trim() ? record.referenceRecu : "Non renseignée"}
            />
            <DetailField icon={Building2} label="Chapitre" value={record.chapitre} />
            <DetailField icon={MapPinned} label="District" value={record.district} />
            <DetailField icon={Users} label="Groupe" value={record.groupe} />
            {record.type === "zaimu-special" && (
              <DetailField icon={HeartHandshake} label="Motif" value={record.motif || "—"} />
            )}
            <DetailField
              icon={StickyNote}
              label="Note"
              value={record.note?.trim() ? record.note : "Aucune note"}
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-secondary/40 p-4">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Layers3 size={12} />
              Synthèse
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">
              {meta.label} pour <strong>{record.membre}</strong>
              {record.motif ? ` — ${record.motif}` : ""}. Montant de{" "}
              <strong>{fmt(record.montant)} FCFA</strong>, statut <strong>{record.statut}</strong>
              {record.referenceRecu?.trim() ? (
                <>
                  {" "}
                  · reçu <strong>{record.referenceRecu}</strong>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border bg-card/95 p-4 sm:flex sm:justify-end sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--sgi-red)]/30 px-4 py-3 text-sm font-medium text-[var(--sgi-red)] transition hover:bg-[var(--sgi-red)]/10"
          >
            <Trash2 size={14} /> Supprimer
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Edit2 size={14} /> Modifier
          </button>
        </div>
      </div>
    </div>
  );
}

function CollecteFormModal({
  title,
  initial,
  memberOptions,
  members,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: Omit<CollecteRecord, "id"> & { id?: string };
  memberOptions: string[];
  members: MemberRecord[];
  onClose: () => void;
  onSubmit: (values: Omit<CollecteRecord, "id">) => void | Promise<void>;
}) {
  const orgTree = useOrgTree();
  const [orgIds, setOrgIds] = useState<OrgSelectionIds>({
    chapitreId: "",
    districtId: "",
    groupeId: "",
  });
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [campaigns, setCampaigns] = useState<ZaimuCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const isEdit = Boolean(initial.id);
  const statutOptions = isEdit ? STATUT_OPTIONS : STATUT_OPTIONS_CREATE;
  const meta = TAB_META[values.type];
  const Icon = meta.icon;
  const showMotif = values.type === "zaimu-special";
  const showCampaignSelect = values.type === "zaimu-special";

  useEffect(() => {
    if (orgTree.loading || orgTree.chapitres.length === 0) return;
    const next = orgTree.coerceSelection(
      orgTree.findByNames({
        chapitre: initial.chapitre,
        district: initial.district,
        groupe: initial.groupe,
      }),
    );
    setOrgIds(next);
    setValues((prev) => ({ ...prev, ...orgTree.nameOf(next) }));
  }, [
    orgTree.loading,
    orgTree.chapitres,
    orgTree.coerceSelection,
    orgTree.findByNames,
    orgTree.nameOf,
    initial.chapitre,
    initial.district,
    initial.groupe,
  ]);

  useEffect(() => {
    if (!showCampaignSelect) return;
    let cancelled = false;
    setCampaignsLoading(true);
    void listSpecialCampaigns().then((res) => {
      if (cancelled) return;
      setCampaignsLoading(false);
      if (res.error) {
        setCampaigns([]);
        return;
      }
      const list = res.data.filter((c) => c.is_active);
      setCampaigns(list);
      const byLabel = list.find(
        (c) => c.label.trim().toLowerCase() === (initial.periode || "").trim().toLowerCase(),
      );
      const fallback = byLabel || list[0] || null;
      if (fallback) {
        setSelectedCampaignId(fallback.id);
        setValues((prev) => ({
          ...prev,
          periode: fallback.label,
          motif: prev.motif?.trim() ? prev.motif : fallback.label,
        }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [showCampaignSelect, initial.periode]);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) || null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.membre.trim()) {
      setError("Le membre est obligatoire.");
      return;
    }
    if (!values.montant || values.montant <= 0) {
      setError("Le montant doit être supérieur à 0.");
      return;
    }
    if (showCampaignSelect && !selectedCampaignId) {
      setError("Choisissez une campagne zaimu spécial.");
      return;
    }
    if (showMotif && !values.motif.trim()) {
      setError("Le motif est obligatoire pour un zaimu spécial.");
      return;
    }
    if (!orgIds.chapitreId || !orgIds.districtId || !orgIds.groupeId) {
      setError("Chapitre, district et groupe sont obligatoires.");
      return;
    }
    const names = orgTree.nameOf(orgIds);
    // À l’ajout, on refuse « Annulé » — uniquement en modification.
    const statut: CollecteStatut =
      !isEdit && values.statut === "Annulé" ? "En attente" : values.statut;
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        numero: values.numero || "",
        type: values.type,
        membre: values.membre,
        montant: Number(values.montant),
        date: values.date,
        statut,
        chapitre: names.chapitre,
        district: names.district,
        groupe: names.groupe,
        periode: selectedCampaign?.label || values.periode,
        motif: values.motif,
        referenceRecu: (values.referenceRecu || "").trim(),
        note: values.note,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const selectMember = (fullName: string) => {
    const member = members.find((item) => memberFullName(item) === fullName);
    if (!member) {
      setValues((prev) => ({ ...prev, membre: fullName }));
      return;
    }
    const next = orgTree.coerceSelection(
      orgTree.findByNames({
        chapitre: member.chapitre,
        district: member.district,
        groupe: member.groupe,
      }),
    );
    setOrgIds(next);
    setValues((prev) => ({
      ...prev,
      membre: fullName,
      ...orgTree.nameOf(next),
    }));
  };

  const districtOptions = orgTree.districtsForChapitreId(orgIds.chapitreId);
  const groupeOptions = orgTree.groupesForDistrictId(orgIds.districtId);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const applyOrg = (next: OrgSelectionIds) => {
    const coerced = orgTree.coerceSelection(next);
    setOrgIds(coerced);
    setValues((prev) => ({ ...prev, ...orgTree.nameOf(coerced) }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sgi-blue-deep)]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-[var(--shadow-lift)] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sgi-tricolor h-1.5 w-full shrink-0" aria-hidden />
        <div
          className="relative shrink-0 px-5 py-4 sm:px-6"
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 0% 0%, rgba(200,151,26,0.16), transparent 55%), linear-gradient(180deg, color-mix(in srgb, var(--sgi-blue) 8%, transparent), transparent)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                style={{ background: meta.accent }}
              >
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{meta.short}</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/80 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {error && (
            <div className="mb-4 rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/10 px-3 py-2 text-sm text-[var(--sgi-red)]">
              {error}
            </div>
          )}
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Saisie</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Membre</label>
              <select
                className="dash-field"
                value={values.membre}
                onChange={(e) => selectMember(e.target.value)}
              >
                {memberOptions.length === 0 && <option value="">Aucun membre</option>}
                {memberOptions.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant (FCFA)</label>
              <input
                type="number"
                min={1}
                className="dash-field"
                value={values.montant || ""}
                onChange={(e) => set("montant", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
              <input type="date" className="dash-field" value={values.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
              <select
                className="dash-field"
                value={
                  !isEdit && values.statut === "Annulé" ? "En attente" : values.statut
                }
                onChange={(e) => set("statut", e.target.value as CollecteStatut)}
              >
                {statutOptions.map((statut) => (
                  <option key={statut} value={statut}>
                    {statut}
                  </option>
                ))}
              </select>
              {!isEdit && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  L’annulation d’un paiement se fait uniquement en modification.
                </p>
              )}
            </div>
            <div className={showCampaignSelect ? "sm:col-span-2" : undefined}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {showCampaignSelect ? "Campagne zaimu spécial" : "Période"}
              </label>
              {showCampaignSelect ? (
                <>
                  <select
                    className="dash-field"
                    value={selectedCampaignId}
                    disabled={campaignsLoading || campaigns.length === 0}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedCampaignId(id);
                      const campaign = campaigns.find((item) => item.id === id);
                      if (!campaign) return;
                      setValues((prev) => ({
                        ...prev,
                        periode: campaign.label,
                        motif: prev.motif?.trim() ? prev.motif : campaign.label,
                      }));
                    }}
                  >
                    {campaignsLoading && <option value="">Chargement des campagnes…</option>}
                    {!campaignsLoading && campaigns.length === 0 && (
                      <option value="">Aucune campagne — créez-en une dans Campagnes & cotas</option>
                    )}
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.label}
                        {campaign.date_echeance
                          ? ` · échéance ${new Date(campaign.date_echeance).toLocaleDateString("fr-FR")}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {selectedCampaign && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Objectif {new Intl.NumberFormat("fr-FR").format(selectedCampaign.montant_centre)} FCFA
                      {selectedCampaign.published_at ? " · publiée" : " · brouillon"}
                    </p>
                  )}
                </>
              ) : (
                <input
                  className="dash-field"
                  value={values.periode}
                  onChange={(e) => set("periode", e.target.value)}
                />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Chapitre</label>
              <select
                className="dash-field"
                value={orgIds.chapitreId}
                disabled={orgTree.loading || orgTree.chapitres.length === 0}
                onChange={(e) =>
                  applyOrg({ chapitreId: e.target.value, districtId: "", groupeId: "" })
                }
              >
                {orgTree.loading && <option value="">Chargement…</option>}
                {orgTree.chapitres.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">District</label>
              <select
                className="dash-field"
                value={orgIds.districtId}
                disabled={orgTree.loading || !orgIds.chapitreId}
                onChange={(e) =>
                  applyOrg({
                    chapitreId: orgIds.chapitreId,
                    districtId: e.target.value,
                    groupeId: "",
                  })
                }
              >
                {districtOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Groupe</label>
              <select
                className="dash-field"
                value={orgIds.groupeId}
                disabled={orgTree.loading || !orgIds.districtId}
                onChange={(e) =>
                  applyOrg({
                    chapitreId: orgIds.chapitreId,
                    districtId: orgIds.districtId,
                    groupeId: e.target.value,
                  })
                }
              >
                {groupeOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            {showMotif && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Motif du zaimu spécial</label>
                <input className="dash-field" value={values.motif} onChange={(e) => set("motif", e.target.value)} placeholder="Ex. Construction, solidarité…" />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Référence du reçu <span className="font-normal text-muted-foreground/80">(optionnel)</span>
              </label>
              <input
                className="dash-field"
                value={values.referenceRecu || ""}
                onChange={(e) => set("referenceRecu", e.target.value)}
                placeholder="Ex. RC-2026-0812"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Note</label>
              <textarea
                rows={3}
                className="dash-field resize-y"
                value={values.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="Informations complémentaires"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-card/95 p-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-muted">
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CollectesModule({ role }: { role: PlatformRole }) {
  const { members, collectes: records, setCollectes: setRecords, reloadCollectes, loading } = useOpsData();
  const [tab, setTab] = useState<CollecteTab>("vague-paix");
  const [pageView, setPageView] = useState<PageView>("liste");
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<"Tous" | CollecteStatut>("Tous");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CollecteRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () => members.map((member) => memberFullName(member)).filter(Boolean),
    [members],
  );

  const meta = TAB_META[tab];
  const Icon = meta.icon;
  const showListPage = pageView === "liste";
  const showCotaSpecialPage = tab === "zaimu-special" && pageView === "cota";
  const showImportExportPage = pageView === "import-export";

  const resolveMemberId = (fullName: string) => {
    const match = members.find((item) => memberFullName(item) === fullName);
    // Les profils responsables n’ont pas d’ID dans public.members → FK collectes_member_id_fkey.
    if (!match || match.source === "profile") return null;
    return match.remoteId || null;
  };

  const filtered = useMemo(() => {
    return records
      .filter((item) => item.type === tab)
      .filter((item) => (statutFilter === "Tous" ? true : item.statut === statutFilter))
      .filter((item) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          item.membre.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          (item.numero || "").toLowerCase().includes(q) ||
          item.groupe.toLowerCase().includes(q) ||
          item.motif.toLowerCase().includes(q) ||
          (item.referenceRecu || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, tab, search, statutFilter]);

  const kpis = useMemo(() => {
    const ofType = records.filter((item) => item.type === tab);
    const validated = ofType.filter((item) => item.statut === "Validé");
    const pending = ofType.filter((item) => item.statut === "En attente");
    const total = validated.reduce((sum, item) => sum + item.montant, 0);
    return {
      count: ofType.length,
      validated: validated.length,
      pending: pending.length,
      total,
    };
  }, [records, tab]);

  const detail = detailId ? records.find((item) => item.id === detailId) ?? null : null;

  const nextLocalId = (type: CollecteTab) => {
    const prefix = type === "vague-paix" ? "VP" : type === "zaimu-ordinaire" ? "ZO" : "ZS";
    const year = new Date().getFullYear();
    const sequence = records.filter((item) => item.type === type).length + 1;
    return `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
  };

  const handleCreate = async (values: Omit<CollecteRecord, "id">) => {
    setActionError(null);
    if (hasRemoteCollectes()) {
      const { data, error } = await createCollecteRemote(values, resolveMemberId(values.membre));
      if (error || !data) throw error || new Error("Création impossible.");
      setRecords((prev) => [data, ...prev]);
      setCreating(false);
      void reloadCollectes();
      return;
    }
    const localNumero = nextLocalId(values.type);
    setRecords((prev) => [
      { id: localNumero, numero: values.numero || localNumero, ...values },
      ...prev,
    ]);
    setCreating(false);
  };

  const handleUpdate = async (values: Omit<CollecteRecord, "id">) => {
    if (!editing) return;
    setActionError(null);
    if (hasRemoteCollectes()) {
      const { data, error } = await updateCollecteRemote(
        editing.id,
        values,
        resolveMemberId(values.membre),
      );
      if (error || !data) throw error || new Error("Mise à jour impossible.");
      setRecords((prev) => prev.map((item) => (item.id === editing.id ? data : item)));
      setEditing(null);
      setDetailId(null);
      void reloadCollectes();
      return;
    }
    setRecords((prev) => prev.map((item) => (item.id === editing.id ? { ...item, ...values } : item)));
    setEditing(null);
    setDetailId(null);
  };

  const handleDelete = async (id: string) => {
    const target = records.find((item) => item.id === id);
    if (!target) return;
    const ok = window.confirm(`Supprimer l’enregistrement de ${target.membre} ?`);
    if (!ok) return;
    setActionError(null);
    if (hasRemoteCollectes()) {
      const { error } = await deleteCollecteRemote(id);
      if (error) {
        setActionError(error.message);
        return;
      }
    }
    setRecords((prev) => prev.filter((item) => item.id !== id));
    setDetailId(null);
    setEditing(null);
  };

  const handleImportRecords = async (imported: CollecteRecord[]) => {
    if (hasRemoteCollectes()) {
      for (const item of imported) {
        const { id: _id, ...values } = item;
        await createCollecteRemote(values, resolveMemberId(values.membre));
      }
      await reloadCollectes();
      return;
    }
    setRecords((prev) => [...imported, ...prev]);
  };

  const subViews =
    tab === "zaimu-special"
      ? ([
          { key: "liste" as const, label: "Liste des paiements" },
          { key: "cota" as const, label: "Campagnes & cotas" },
          { key: "import-export" as const, label: "Import / Export" },
        ] as const)
      : ([
          { key: "liste" as const, label: "Liste" },
          { key: "import-export" as const, label: "Import / Export" },
        ] as const);

  return (
    <div className="dash-page gap-5 sm:gap-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="sgi-tricolor h-1.5 w-full" aria-hidden />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">
              Collectes · {meta.short}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{meta.label}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
          </div>
          {showListPage && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
            >
              <Plus size={15} /> Ajouter
            </button>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 sm:px-3">
          {(Object.keys(TAB_META) as CollecteTab[]).map((key) => {
            const item = TAB_META[key];
            const TabIcon = item.icon;
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setSearch("");
                  setStatutFilter("Tous");
                  setCreating(false);
                  setPageView("liste");
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--sgi-blue)] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <TabIcon size={15} />
                <span className="whitespace-nowrap">{item.short}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-border bg-secondary/20 px-2 py-2 sm:px-3">
          {subViews.map((item) => {
            const active = pageView === item.key;
            const accent =
              tab === "zaimu-special"
                ? "bg-[var(--sgi-red)] text-white"
                : "bg-[var(--sgi-blue)] text-white";
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setPageView(item.key);
                  setCreating(false);
                }}
                className={`inline-flex shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? accent
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {actionError && (
        <div className="rounded-xl border border-[var(--sgi-red)]/25 bg-[var(--sgi-red)]/5 px-4 py-3 text-sm text-[var(--sgi-red)]">
          {actionError}
        </div>
      )}
      {loading && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Synchronisation membres / collectes…
        </div>
      )}

      {showCotaSpecialPage && (
        <ZaimuSpecialCampaignsPanel role={role} collectes={records} />
      )}

      {showImportExportPage && (
        <CollectesImportExportBar
          type={tab}
          records={records}
          filteredRecords={filtered}
          onImport={handleImportRecords}
        />
      )}

      {showListPage && (
      <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Enregistrements", value: String(kpis.count), tone: "text-[var(--sgi-blue)]", bg: "bg-[var(--sgi-blue)]/10" },
          { label: "Validés", value: String(kpis.validated), tone: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/12" },
          { label: "En attente", value: String(kpis.pending), tone: "text-[var(--sgi-gold)]", bg: "bg-[var(--sgi-gold)]/15" },
          { label: "Montant validé", value: `${fmt(kpis.total)}`, tone: "text-[var(--sgi-red)]", bg: "bg-[var(--sgi-red)]/10", suffix: "FCFA" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${kpi.bg} ${kpi.tone}`}>
              <Icon size={15} />
            </div>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`mt-0.5 truncate font-display text-lg font-bold ${kpi.tone}`} style={{ fontFamily: "var(--font-mono)" }}>
              {kpi.value}
            </p>
            {kpi.suffix && <p className="text-[11px] text-muted-foreground">{kpi.suffix}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:min-w-[14rem]">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Recherche</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="dash-field pl-8"
                placeholder="Membre, référence, groupe…"
              />
            </div>
          </div>
          <div className="w-full sm:w-44">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
            <select
              className="dash-field"
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value as "Tous" | CollecteStatut)}
            >
              <option value="Tous">Tous</option>
              {STATUT_OPTIONS.map((statut) => (
                <option key={statut}>{statut}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            {meta.short} — {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-3 md:hidden">
          {filtered.length === 0 && (
            <p className="rounded-xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun enregistrement pour cet onglet.
            </p>
          )}
          {filtered.map((item) => (
            <article key={item.id} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <MemberAvatar photo={findMemberPhotoByName(item.membre, members)} name={item.membre} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{item.membre}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {displayCollecteNumero(item)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatutPill statut={item.statut} />
                  <RowActionsMenu
                    actions={[
                      {
                        label: "Voir le détail",
                        icon: <Eye size={14} />,
                        onClick: () => setDetailId(item.id),
                      },
                      {
                        label: "Modifier",
                        icon: <Edit2 size={14} />,
                        onClick: () => setEditing(item),
                      },
                      {
                        label: "Supprimer",
                        icon: <Trash2 size={14} />,
                        tone: "danger",
                        onClick: () => handleDelete(item.id),
                      },
                    ]}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{item.date}</span>
                <span className="font-medium text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  {fmt(item.montant)} FCFA
                </span>
                <span>{item.groupe}</span>
                {item.referenceRecu?.trim() && (
                  <span className="font-mono text-foreground/80">Reçu {item.referenceRecu}</span>
                )}
                {item.motif && <span>{item.motif}</span>}
              </div>
            </article>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {[
                  "N°",
                  "Réf. reçu",
                  "Date",
                  "Membre",
                  "Montant",
                  tab === "zaimu-special" ? "Campagne" : "Période",
                  "Groupe",
                  "Statut",
                  "Actions",
                ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {header}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Aucun enregistrement pour cet onglet.
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {displayCollecteNumero(item)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {item.referenceRecu?.trim() ? item.referenceRecu : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar photo={findMemberPhotoByName(item.membre, members)} name={item.membre} size="sm" />
                      <span className="font-medium text-foreground">{item.membre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmt(item.montant)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tab === "zaimu-special"
                      ? item.periode || item.motif || "—"
                      : item.periode || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.groupe}</td>
                  <td className="px-4 py-3">
                    <StatutPill statut={item.statut} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActionsMenu
                      actions={[
                        {
                          label: "Voir le détail",
                          icon: <Eye size={14} />,
                          onClick: () => setDetailId(item.id),
                        },
                        {
                          label: "Modifier",
                          icon: <Edit2 size={14} />,
                          onClick: () => setEditing(item),
                        },
                        {
                          label: "Supprimer",
                          icon: <Trash2 size={14} />,
                          tone: "danger",
                          onClick: () => handleDelete(item.id),
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
      </>
      )}

      {detail && (
        <DetailModal
          record={detail}
          photo={findMemberPhotoByName(detail.membre, members)}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditing(detail);
            setDetailId(null);
          }}
          onDelete={() => void handleDelete(detail.id)}
        />
      )}

      {creating && showListPage && (
        <CollecteFormModal
          title={`Ajouter — ${meta.short}`}
          initial={emptyForm(tab, memberOptions)}
          memberOptions={memberOptions}
          members={members}
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <CollecteFormModal
          title="Modifier la collecte"
          initial={editing}
          memberOptions={memberOptions}
          members={members}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
