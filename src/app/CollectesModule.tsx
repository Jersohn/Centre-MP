import { useMemo, useState, type FormEvent, type ReactNode } from "react";
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
import { findMemberPhotoByName, memberFullName, MEMBERS_SEED } from "./membersData";
import CollectesImportExportBar from "./CollectesImportExportBar";
import ZaimuQuotaPanel from "./ZaimuQuotaPanel";
import type { PlatformRole } from "./roles";
import {
  CHAPITRE_NAMES,
  coerceOrgSelection,
  defaultChapitre,
  defaultDistrict,
  defaultGroupe,
  districtsForChapitre,
  groupesForDistrict,
} from "./orgHierarchy";

export type CollecteTab = "vague-paix" | "zaimu-ordinaire" | "zaimu-special";
export type CollecteStatut = "En attente" | "Validé" | "Annulé";

export interface CollecteRecord {
  id: string;
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

const MEMBER_OPTIONS = MEMBERS_SEED.map((member) => memberFullName(member));

const CHAPITRE_OPTIONS = CHAPITRE_NAMES;
const STATUT_OPTIONS: CollecteStatut[] = ["En attente", "Validé", "Annulé"];

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
    description: "Collecte des dons zaimu réguliers.",
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

function seedCollecte(
  partial: Omit<CollecteRecord, "chapitre" | "district" | "groupe" | "membre"> & {
    memberId: number;
  },
): CollecteRecord {
  const member = MEMBERS_SEED.find((item) => item.id === partial.memberId) || MEMBERS_SEED[0];
  return {
    id: partial.id,
    type: partial.type,
    membre: memberFullName(member),
    montant: partial.montant,
    date: partial.date,
    statut: partial.statut,
    chapitre: member.chapitre,
    district: member.district,
    groupe: member.groupe,
    periode: partial.periode,
    motif: partial.motif,
    referenceRecu: partial.referenceRecu,
    note: partial.note,
  };
}

export const COLLECTES_SEED: CollecteRecord[] = [
  seedCollecte({
    id: "VP-2026-001",
    memberId: 1,
    type: "vague-paix",
    montant: 15000,
    date: "2026-08-01",
    statut: "Validé",
    periode: "Août 2026",
    motif: "",
    referenceRecu: "RC-VP-260801",
    note: "Abonnement annuel en cours",
  }),
  seedCollecte({
    id: "VP-2026-002",
    memberId: 8,
    type: "vague-paix",
    montant: 15000,
    date: "2026-08-03",
    statut: "En attente",
    periode: "Août 2026",
    motif: "",
    referenceRecu: "",
    note: "",
  }),
  seedCollecte({
    id: "VP-2026-003",
    memberId: 15,
    type: "vague-paix",
    montant: 15000,
    date: "2026-07-28",
    statut: "Validé",
    periode: "Juillet 2026",
    motif: "",
    referenceRecu: "RC-VP-260728",
    note: "",
  }),
  seedCollecte({
    id: "ZO-2026-001",
    memberId: 2,
    type: "zaimu-ordinaire",
    montant: 25000,
    date: "2026-08-02",
    statut: "Validé",
    periode: "Août 2026",
    motif: "",
    referenceRecu: "RC-ZO-260802",
    note: "Don mensuel",
  }),
  seedCollecte({
    id: "ZO-2026-002",
    memberId: 4,
    type: "zaimu-ordinaire",
    montant: 10000,
    date: "2026-08-04",
    statut: "Validé",
    periode: "Août 2026",
    motif: "",
    referenceRecu: "RC-ZO-260804",
    note: "",
  }),
  seedCollecte({
    id: "ZO-2026-003",
    memberId: 12,
    type: "zaimu-ordinaire",
    montant: 5000,
    date: "2026-07-30",
    statut: "Annulé",
    periode: "Juillet 2026",
    motif: "",
    referenceRecu: "",
    note: "Paiement non abouti",
  }),
  seedCollecte({
    id: "ZS-2026-001",
    memberId: 9,
    type: "zaimu-special",
    montant: 100000,
    date: "2026-08-05",
    statut: "Validé",
    periode: "Campagne 2026",
    motif: "Construction du centre",
    referenceRecu: "RC-ZS-260805",
    note: "Don exceptionnel",
  }),
  seedCollecte({
    id: "ZS-2026-002",
    memberId: 16,
    type: "zaimu-special",
    montant: 50000,
    date: "2026-08-06",
    statut: "En attente",
    periode: "Campagne 2026",
    motif: "Solidarité jeunesse",
    referenceRecu: "",
    note: "",
  }),
  seedCollecte({
    id: "ZS-2026-003",
    memberId: 20,
    type: "zaimu-special",
    montant: 75000,
    date: "2026-07-20",
    statut: "Validé",
    periode: "Campagne 2026",
    motif: "Équipement butsudan",
    referenceRecu: "RC-ZS-260720",
    note: "",
  }),
];

const emptyForm = (type: CollecteTab): Omit<CollecteRecord, "id"> => ({
  type,
  membre: MEMBER_OPTIONS[0],
  montant: type === "vague-paix" ? 15000 : 0,
  date: new Date().toISOString().slice(0, 10),
  statut: "En attente",
  chapitre: defaultChapitre(),
  district: defaultDistrict(),
  groupe: defaultGroupe(),
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
  onClose,
  onEdit,
  onDelete,
}: {
  record: CollecteRecord;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = TAB_META[record.type];
  const Icon = meta.icon;
  const photo = findMemberPhotoByName(record.membre);

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
              <p className="mt-1 font-mono text-xs text-muted-foreground">{record.id}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[var(--sgi-gold)]/25 bg-card/90 p-4 shadow-sm backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">Montant</p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {fmt(record.montant)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">CDF</p>
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
              <strong>{fmt(record.montant)} CDF</strong>, statut <strong>{record.statut}</strong>
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
  onClose,
  onSubmit,
}: {
  title: string;
  initial: Omit<CollecteRecord, "id"> & { id?: string };
  onClose: () => void;
  onSubmit: (values: Omit<CollecteRecord, "id">) => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState("");
  const meta = TAB_META[values.type];
  const Icon = meta.icon;
  const showMotif = values.type === "zaimu-special";

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.membre.trim()) {
      setError("Le membre est obligatoire.");
      return;
    }
    if (!values.montant || values.montant <= 0) {
      setError("Le montant doit être supérieur à 0.");
      return;
    }
    if (showMotif && !values.motif.trim()) {
      setError("Le motif est obligatoire pour un zaimu spécial.");
      return;
    }
    onSubmit({
      type: values.type,
      membre: values.membre,
      montant: Number(values.montant),
      date: values.date,
      statut: values.statut,
      chapitre: values.chapitre,
      district: values.district,
      groupe: values.groupe,
      periode: values.periode,
      motif: values.motif,
      referenceRecu: (values.referenceRecu || "").trim(),
      note: values.note,
    });
  };

  const districtOptions = districtsForChapitre(values.chapitre);
  const groupeOptions = groupesForDistrict(values.chapitre, values.district);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((prev) => {
      if (key === "chapitre" || key === "district" || key === "groupe") {
        return {
          ...prev,
          ...coerceOrgSelection({
            chapitre: key === "chapitre" ? String(value) : prev.chapitre,
            district: key === "district" ? String(value) : prev.district,
            groupe: key === "groupe" ? String(value) : prev.groupe,
          }),
        };
      }
      return { ...prev, [key]: value };
    });
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
              <select className="dash-field" value={values.membre} onChange={(e) => set("membre", e.target.value)}>
                {MEMBER_OPTIONS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant (CDF)</label>
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
              <select className="dash-field" value={values.statut} onChange={(e) => set("statut", e.target.value as CollecteStatut)}>
                {STATUT_OPTIONS.map((statut) => (
                  <option key={statut}>{statut}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {values.type === "zaimu-special" ? "Campagne / période" : "Période"}
              </label>
              <input className="dash-field" value={values.periode} onChange={(e) => set("periode", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Chapitre</label>
              <select className="dash-field" value={values.chapitre} onChange={(e) => set("chapitre", e.target.value)}>
                {CHAPITRE_OPTIONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">District</label>
              <select className="dash-field" value={values.district} onChange={(e) => set("district", e.target.value)}>
                {districtOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Groupe</label>
              <select className="dash-field" value={values.groupe} onChange={(e) => set("groupe", e.target.value)}>
                {groupeOptions.map((item) => (
                  <option key={item}>{item}</option>
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
          <button type="submit" className="rounded-xl bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CollectesModule({ role }: { role: PlatformRole }) {
  const [tab, setTab] = useState<CollecteTab>("vague-paix");
  const [pageView, setPageView] = useState<PageView>("liste");
  const [records, setRecords] = useState<CollecteRecord[]>(COLLECTES_SEED);
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<"Tous" | CollecteStatut>("Tous");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CollecteRecord | null>(null);
  const [creating, setCreating] = useState(false);

  const meta = TAB_META[tab];
  const Icon = meta.icon;
  const showListPage = pageView === "liste";
  const showCotaPage = tab === "zaimu-special" && pageView === "cota";
  const showImportExportPage = pageView === "import-export";

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

  const nextId = (type: CollecteTab) => {
    const prefix = type === "vague-paix" ? "VP" : type === "zaimu-ordinaire" ? "ZO" : "ZS";
    const year = new Date().getFullYear();
    const sequence = records.filter((item) => item.type === type).length + 1;
    return `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
  };

  const handleCreate = (values: Omit<CollecteRecord, "id">) => {
    setRecords((prev) => [{ id: nextId(values.type), ...values }, ...prev]);
    setCreating(false);
  };

  const handleUpdate = (values: Omit<CollecteRecord, "id">) => {
    if (!editing) return;
    setRecords((prev) => prev.map((item) => (item.id === editing.id ? { ...item, ...values } : item)));
    setEditing(null);
    setDetailId(null);
  };

  const handleDelete = (id: string) => {
    const target = records.find((item) => item.id === id);
    if (!target) return;
    const ok = window.confirm(`Supprimer l’enregistrement ${target.id} de ${target.membre} ?`);
    if (!ok) return;
    setRecords((prev) => prev.filter((item) => item.id !== id));
    setDetailId(null);
    setEditing(null);
  };

  const handleImportRecords = (imported: CollecteRecord[]) => {
    setRecords((prev) => [...imported, ...prev]);
  };

  const subViews =
    tab === "zaimu-special"
      ? ([
          { key: "liste" as const, label: "Liste des paiements" },
          { key: "cota" as const, label: "Cota & restes" },
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

      {showCotaPage && <ZaimuQuotaPanel role={role} collectes={records} />}

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
          { label: "Montant validé", value: `${fmt(kpis.total)}`, tone: "text-[var(--sgi-red)]", bg: "bg-[var(--sgi-red)]/10", suffix: "CDF" },
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
                  <MemberAvatar photo={findMemberPhotoByName(item.membre)} name={item.membre} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{item.membre}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{item.id}</p>
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
                  {fmt(item.montant)} CDF
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
                  tab === "zaimu-special" ? "Motif" : "Période",
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
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {item.referenceRecu?.trim() ? item.referenceRecu : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{item.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <MemberAvatar photo={findMemberPhotoByName(item.membre)} name={item.membre} size="sm" />
                      <span className="font-medium text-foreground">{item.membre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmt(item.montant)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tab === "zaimu-special" ? item.motif || "—" : item.periode || "—"}
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
          onClose={() => setDetailId(null)}
          onEdit={() => {
            setEditing(detail);
            setDetailId(null);
          }}
          onDelete={() => handleDelete(detail.id)}
        />
      )}

      {creating && showListPage && (
        <CollecteFormModal
          title={`Ajouter — ${meta.short}`}
          initial={emptyForm(tab)}
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <CollecteFormModal
          title={`Modifier — ${editing.id}`}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
