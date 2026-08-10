import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle,
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
import { RowActionsMenu, type RowAction } from "./RowActionsMenu";
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
  listMyAssignedSpecialCampaigns,
  listQuotaAssignments,
  listSpecialCampaigns,
  type ZaimuCampaign,
} from "../services/quotaService";
import { fetchMyProfile } from "../services/profileService";
import { useConfirm } from "./ConfirmDialog";
import { orgScopeFromProfile } from "./memberListStats";

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
  /** IDs org saisis dans le formulaire (évite une résolution ambiguë par nom). */
  orgIds?: {
    chapitre_id: string;
    district_id: string;
    groupe_id: string;
  };
}

function displayCollecteNumero(record: Pick<CollecteRecord, "id" | "numero">) {
  if (isVaguePaixPlaceholder(record)) return "Abonné";
  return record.numero?.trim() || record.id;
}

const STATUT_OPTIONS: CollecteStatut[] = ["En attente", "Validé", "Annulé"];

const MONTH_OPTIONS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
] as const;

function parseCollecteDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((value || "").trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    iso: `${match[1]}-${match[2]}-${match[3]}`,
  };
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function campaignLabelOf(record: Pick<CollecteRecord, "periode" | "motif">) {
  return (record.periode || record.motif || "").trim();
}

function matchesCampaignLabel(
  record: Pick<CollecteRecord, "periode" | "motif">,
  campaignLabel: string | null | undefined,
) {
  const label = normalizeLabel(campaignLabel || "");
  if (!label) return true;
  return (
    normalizeLabel(record.periode) === label || normalizeLabel(record.motif) === label
  );
}

const VP_PLACEHOLDER_PREFIX = "vp-abonné:";

function isVaguePaixPlaceholder(item: Pick<CollecteRecord, "id">) {
  return item.id.startsWith(VP_PLACEHOLDER_PREFIX);
}

function vaguePaixPlaceholderFromMember(member: MemberRecord): CollecteRecord {
  const name = memberFullName(member);
  return {
    id: `${VP_PLACEHOLDER_PREFIX}${member.remoteId || member.id}`,
    numero: "",
    type: "vague-paix",
    membre: name,
    montant: 0,
    date: member.adhesion || new Date().toISOString().slice(0, 10),
    statut: "En attente",
    chapitre: member.chapitre,
    district: member.district,
    groupe: member.groupe,
    periode: "",
    motif: "",
    referenceRecu: "",
    note: "Montant à renseigner par le responsable groupe",
    orgIds:
      member.chapitreId && member.districtId && member.groupeId
        ? {
            chapitre_id: member.chapitreId,
            district_id: member.districtId,
            groupe_id: member.groupeId,
          }
        : undefined,
  };
}

/** Liste VP = abonnés (case cochée) + paiements saisis ; les montants peuvent venir plus tard. */
function buildVaguePaixRows(members: MemberRecord[], records: CollecteRecord[]): CollecteRecord[] {
  const vpPayments = records.filter((item) => item.type === "vague-paix");
  const paymentsByMember = new Map<string, CollecteRecord[]>();
  for (const payment of vpPayments) {
    const key = normalizeLabel(payment.membre);
    const list = paymentsByMember.get(key) || [];
    list.push(payment);
    paymentsByMember.set(key, list);
  }

  const rows: CollecteRecord[] = [];
  const covered = new Set<string>();

  for (const member of members.filter((item) => item.abonnementVaguePaix)) {
    const name = memberFullName(member);
    const key = normalizeLabel(name);
    covered.add(key);
    const payments = (paymentsByMember.get(key) || []).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    if (payments.length > 0) {
      rows.push(...payments);
    } else {
      rows.push(vaguePaixPlaceholderFromMember(member));
    }
  }

  // Paiements historiques non rattachés à un abonné flaggé (données anciennes)
  for (const payment of vpPayments) {
    const key = normalizeLabel(payment.membre);
    if (covered.has(key)) continue;
    rows.push(payment);
    covered.add(key);
  }

  return rows.sort((a, b) => {
    const byGroupe = a.groupe.localeCompare(b.groupe, "fr");
    if (byGroupe !== 0) return byGroupe;
    return a.membre.localeCompare(b.membre, "fr");
  });
}

function paidZaimuSpecialForMember(
  records: CollecteRecord[],
  memberName: string,
  campaignLabel: string,
) {
  const name = normalizeLabel(memberName);
  const label = normalizeLabel(campaignLabel);
  return records
    .filter((item) => item.type === "zaimu-special" && item.statut === "Validé")
    .filter((item) => normalizeLabel(item.membre) === name)
    .filter((item) => {
      if (!label) return true;
      return (
        normalizeLabel(item.periode) === label || normalizeLabel(item.motif) === label
      );
    })
    .reduce((sum, item) => sum + item.montant, 0);
}

function perimeterLabelForRole(role: PlatformRole) {
  if (role === "groupe") return "Groupe";
  if (role === "district") return "District";
  if (role === "chapitre") return "Chapitre";
  return "Périmètre";
}

/** Cota assignée au niveau du rôle (pas la somme des enfants). */
function assignedCotaForRole(
  role: PlatformRole,
  campaign: ZaimuCampaign,
  assignments: Awaited<ReturnType<typeof listQuotaAssignments>>["data"],
  scope: {
    chapitre_id: string | null;
    district_id: string | null;
    groupe_id: string | null;
  },
) {
  const rows = assignments || [];
  if (role === "admin" || role === "centre") {
    const centreRow = rows.find((row) => row.level === "centre");
    return Number(centreRow?.assigne || campaign.montant_centre || 0);
  }
  if (role === "chapitre" && scope.chapitre_id) {
    return rows
      .filter((row) => row.level === "chapitre" && row.chapitre_id === scope.chapitre_id)
      .reduce((sum, row) => sum + Number(row.assigne || 0), 0);
  }
  if (role === "district" && scope.district_id) {
    return rows
      .filter((row) => row.level === "district" && row.district_id === scope.district_id)
      .reduce((sum, row) => sum + Number(row.assigne || 0), 0);
  }
  if (role === "groupe" && scope.groupe_id) {
    return rows
      .filter((row) => row.level === "groupe" && row.groupe_id === scope.groupe_id)
      .reduce((sum, row) => sum + Number(row.assigne || 0), 0);
  }
  return 0;
}

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
  campaignLabel?: string | null,
): Omit<CollecteRecord, "id"> => ({
  numero: "",
  type,
  membre: memberOptions[0] || "",
  montant: 0,
  date: new Date().toISOString().slice(0, 10),
  statut: "En attente",
  chapitre: "",
  district: "",
  groupe: "",
  periode:
    type === "zaimu-special"
      ? campaignLabel?.trim() || "Campagne 2026"
      : "Août 2026",
  motif: type === "zaimu-special" ? campaignLabel?.trim() || "" : "",
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
  memberBalance,
  canValidate = false,
  canEdit = true,
  canDelete = true,
  onClose,
  onEdit,
  onDelete,
  onValidate,
}: {
  record: CollecteRecord;
  photo?: string;
  memberBalance?: { engagement: number; paye: number; reste: number } | null;
  canValidate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onValidate?: () => void;
}) {
  const meta = TAB_META[record.type];
  const Icon = meta.icon;
  const lockedValidated = record.statut === "Validé" && !canEdit;

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
              <p className="mt-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sgi-gold)]">Montant</p>
              {isVaguePaixPlaceholder(record) || record.montant <= 0 ? (
                <>
                  <p className="mt-1 font-display text-2xl font-bold tracking-tight text-muted-foreground">
                    À renseigner
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">par le responsable groupe</p>
                </>
              ) : (
                <>
                  <p className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                    {fmt(record.montant)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">FCFA</p>
                </>
              )}
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
            {record.type === "zaimu-special" && memberBalance && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/70 pt-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Engagement
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                    {fmt(memberBalance.engagement)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Payé
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {fmt(memberBalance.paye)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Reste
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--sgi-red)]">
                    {fmt(memberBalance.reste)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border bg-card/95 p-4 sm:flex sm:justify-end sm:gap-3 sm:px-6">
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--sgi-red)]/30 px-4 py-3 text-sm font-medium text-[var(--sgi-red)] transition hover:bg-[var(--sgi-red)]/10"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          )}
          {canValidate && record.statut === "En attente" && onValidate && (
            <button
              type="button"
              onClick={onValidate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <CheckCircle size={14} /> Valider
            </button>
          )}
          {canEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Edit2 size={14} /> Modifier
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Fermer
            </button>
          )}
        </div>
        {lockedValidated && (
          <p className="border-t border-border px-4 py-2 text-center text-[11px] text-muted-foreground sm:px-6">
            Paiement validé — modification réservée au centre ou à l’administrateur.
          </p>
        )}
      </div>
    </div>
  );
}

function CollecteFormModal({
  title,
  initial,
  memberOptions,
  members,
  actorRole,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: Omit<CollecteRecord, "id"> & { id?: string };
  memberOptions: string[];
  members: MemberRecord[];
  actorRole: PlatformRole;
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
  const isEdit = Boolean(initial.id) && !isVaguePaixPlaceholder({ id: String(initial.id) });
  const meta = TAB_META[values.type];
  const Icon = meta.icon;
  const showMotif = values.type === "zaimu-special";
  const showCampaignSelect = values.type === "zaimu-special";
  const lockChapitre =
    actorRole === "chapitre" || actorRole === "district" || actorRole === "groupe";
  const lockDistrict = actorRole === "district" || actorRole === "groupe";
  const lockGroupe = actorRole === "groupe";
  const isVpAmountEntry = values.type === "vague-paix" && !isEdit;

  const applyOrgFromMember = (member: MemberRecord) => {
    let chapitreId = member.chapitreId || "";
    let districtId = member.districtId || "";
    let groupeId = member.groupeId || "";

    if (groupeId) {
      const groupe = orgTree.groupes.find((item) => item.id === groupeId);
      if (groupe) districtId = districtId || groupe.district_id;
    }
    if (districtId) {
      const district = orgTree.districts.find((item) => item.id === districtId);
      if (district) chapitreId = chapitreId || district.chapitre_id;
    }

    const fromIds =
      chapitreId || districtId || groupeId
        ? { chapitreId, districtId, groupeId }
        : orgTree.findByNames({
            chapitre: member.chapitre,
            district: member.district,
            groupe: member.groupe,
          });
    const next = orgTree.coerceSelection(fromIds);
    setOrgIds(next);
    setValues((prev) => ({
      ...prev,
      membre: memberFullName(member),
      ...orgTree.nameOf(next),
    }));
    return next;
  };

  useEffect(() => {
    if (orgTree.loading || orgTree.chapitres.length === 0) return;

    const memberName = (initial.membre || "").trim();
    if (memberName) {
      const member = members.find((item) => memberFullName(item) === memberName);
      if (member) {
        applyOrgFromMember(member);
        return;
      }
    }

    if (initial.orgIds?.chapitre_id) {
      const next = orgTree.coerceSelection({
        chapitreId: initial.orgIds.chapitre_id,
        districtId: initial.orgIds.district_id,
        groupeId: initial.orgIds.groupe_id,
      });
      setOrgIds(next);
      setValues((prev) => ({ ...prev, ...orgTree.nameOf(next) }));
      return;
    }

    if (initial.chapitre || initial.district || initial.groupe) {
      const next = orgTree.coerceSelection(
        orgTree.findByNames({
          chapitre: initial.chapitre,
          district: initial.district,
          groupe: initial.groupe,
        }),
      );
      setOrgIds(next);
      setValues((prev) => ({ ...prev, ...orgTree.nameOf(next) }));
    }
  }, [
    orgTree.loading,
    orgTree.chapitres,
    orgTree.coerceSelection,
    orgTree.findByNames,
    orgTree.nameOf,
    initial.membre,
    initial.chapitre,
    initial.district,
    initial.groupe,
    initial.orgIds?.chapitre_id,
    initial.orgIds?.district_id,
    initial.orgIds?.groupe_id,
    members,
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
    // À l’ajout : statut forcé « En attente » (modifiable uniquement ensuite).
    const statut: CollecteStatut = isEdit ? values.statut : "En attente";
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
        orgIds: {
          chapitre_id: orgIds.chapitreId,
          district_id: orgIds.districtId,
          groupe_id: orgIds.groupeId,
        },
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
    applyOrgFromMember(member);
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
              {values.type === "vague-paix" && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {memberOptions.length === 0
                    ? "Aucun abonné Vague de Paix dans votre périmètre. Cochez la case à la création du membre."
                    : isVpAmountEntry
                      ? "Abonnés Vague de Paix — renseignez le montant pour la période."
                      : "Modification d’un paiement Vague de Paix."}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant (FCFA)</label>
              <input
                type="number"
                min={1}
                className="dash-field"
                value={values.montant || ""}
                onChange={(e) => set("montant", Number(e.target.value))}
                placeholder={isVpAmountEntry ? "À renseigner" : undefined}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
              <input type="date" className="dash-field" value={values.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            {isEdit && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
                <select
                  className="dash-field"
                  value={values.statut}
                  onChange={(e) => set("statut", e.target.value as CollecteStatut)}
                >
                  {STATUT_OPTIONS.map((statut) => (
                    <option key={statut} value={statut}>
                      {statut}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                disabled={
                  lockChapitre || orgTree.loading || orgTree.chapitres.length === 0
                }
                onChange={(e) =>
                  applyOrg({ chapitreId: e.target.value, districtId: "", groupeId: "" })
                }
              >
                {orgTree.loading && <option value="">Chargement…</option>}
                {!orgIds.chapitreId && <option value="">Sélectionner…</option>}
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
                disabled={lockDistrict || orgTree.loading || !orgIds.chapitreId}
                onChange={(e) =>
                  applyOrg({
                    chapitreId: orgIds.chapitreId,
                    districtId: e.target.value,
                    groupeId: "",
                  })
                }
              >
                {!orgIds.districtId && <option value="">Sélectionner…</option>}
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
                disabled={lockGroupe || orgTree.loading || !orgIds.districtId}
                onChange={(e) =>
                  applyOrg({
                    chapitreId: orgIds.chapitreId,
                    districtId: orgIds.districtId,
                    groupeId: e.target.value,
                  })
                }
              >
                {!orgIds.groupeId && <option value="">Sélectionner…</option>}
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

export default function CollectesModule({
  role,
  focus = null,
  onFocusApplied,
}: {
  role: PlatformRole;
  focus?: { tab: CollecteTab; statut: "En attente" | "Validé" | "Annulé" } | null;
  onFocusApplied?: () => void;
}) {
  const { members, collectes: records, setCollectes: setRecords, reloadCollectes, reloadMembers, loading } = useOpsData();
  const { confirm } = useConfirm();
  const orgTree = useOrgTree();
  const [tab, setTab] = useState<CollecteTab>(focus?.tab || "vague-paix");
  const [pageView, setPageView] = useState<PageView>("liste");
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<"Tous" | CollecteStatut>(
    focus?.statut || "Tous",
  );
  const [yearFilter, setYearFilter] = useState<"Tous" | number>("Tous");
  const [monthFilter, setMonthFilter] = useState<"Tous" | number>("Tous");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CollecteRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [memberAssigneByKey, setMemberAssigneByKey] = useState<Record<string, number>>({});
  const [perimeterCota, setPerimeterCota] = useState(0);
  const [specialCampaigns, setSpecialCampaigns] = useState<ZaimuCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [profileScope, setProfileScope] = useState<{
    chapitre_id: string | null;
    district_id: string | null;
    groupe_id: string | null;
  }>({
    chapitre_id: null,
    district_id: null,
    groupe_id: null,
  });

  useEffect(() => {
    if (!focus) return;
    setTab(focus.tab);
    setStatutFilter(focus.statut);
    setPageView("liste");
    setCreating(false);
    setSearch("");
    setYearFilter("Tous");
    setMonthFilter("Tous");
    setDateFrom("");
    setDateTo("");
    onFocusApplied?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nonce force le re-focus
  }, [focus, onFocusApplied]);

  const exportOrgScope = useMemo(() => {
    const chapitre = profileScope.chapitre_id
      ? orgTree.chapitres.find((c) => c.id === profileScope.chapitre_id)?.name || ""
      : "";
    const district = profileScope.district_id
      ? orgTree.districts.find((d) => d.id === profileScope.district_id)?.name || ""
      : "";
    const groupe = profileScope.groupe_id
      ? orgTree.groupes.find((g) => g.id === profileScope.groupe_id)?.name || ""
      : "";
    return orgScopeFromProfile(role, { chapitre, district, groupe });
  }, [role, profileScope, orgTree.chapitres, orgTree.districts, orgTree.groupes]);

  const memberOptions = useMemo(() => {
    // VP : renseigner un montant pour un abonné (case cochée). Autres onglets : tous les membres.
    const source =
      tab === "vague-paix"
        ? members.filter((member) => member.abonnementVaguePaix)
        : members;
    const names = source.map((member) => memberFullName(member)).filter(Boolean);
    if (editing?.membre && !names.includes(editing.membre)) {
      return [editing.membre, ...names];
    }
    return names;
  }, [members, tab, editing]);

  const meta = TAB_META[tab];
  const Icon = meta.icon;
  const showListPage = pageView === "liste";
  const showCotaSpecialPage = tab === "zaimu-special" && pageView === "cota";
  const showImportExportPage = pageView === "import-export";

  useEffect(() => {
    let cancelled = false;
    async function loadProfileScope() {
      const { data } = await fetchMyProfile();
      if (cancelled || !data) return;
      setProfileScope({
        chapitre_id: data.chapitre_id || null,
        district_id: data.district_id || null,
        groupe_id: data.groupe_id || null,
      });
    }
    void loadProfileScope();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (tab !== "zaimu-special") return;
    let cancelled = false;
    async function loadCampaigns() {
      const assigned = await listMyAssignedSpecialCampaigns({
        role,
        chapitre_id: profileScope.chapitre_id,
        district_id: profileScope.district_id,
        groupe_id: profileScope.groupe_id,
      });
      let campaigns = (assigned.data || []).map((row) => row.campaign);
      if (campaigns.length === 0 && (role === "admin" || role === "centre")) {
        const all = await listSpecialCampaigns();
        campaigns = all.data || [];
      }
      campaigns = [...campaigns].sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
      if (cancelled) return;
      setSpecialCampaigns(campaigns);
      setSelectedCampaignId((prev) => {
        if (prev && campaigns.some((c) => c.id === prev)) return prev;
        return campaigns.find((c) => c.is_active)?.id || campaigns[0]?.id || null;
      });
    }
    void loadCampaigns();
    return () => {
      cancelled = true;
    };
  }, [tab, role, profileScope]);

  useEffect(() => {
    if (tab !== "zaimu-special" || !selectedCampaignId) {
      if (tab === "zaimu-special") {
        setPerimeterCota(0);
        setMemberAssigneByKey({});
      }
      return;
    }
    let cancelled = false;
    async function loadSelectedCota() {
      const campaign =
        specialCampaigns.find((c) => c.id === selectedCampaignId) ||
        (await listSpecialCampaigns()).data?.find((c) => c.id === selectedCampaignId);
      if (!campaign || cancelled) return;
      const labelKey = normalizeLabel(campaign.label);
      const { data: assignments } = await listQuotaAssignments(campaign.id);
      if (cancelled) return;
      const memberMap: Record<string, number> = {};
      for (const row of assignments || []) {
        const assigne = Number(row.assigne || 0);
        if (assigne <= 0) continue;
        if (row.level === "membre" && row.member_id) {
          const key = `${labelKey}::${row.member_id}`;
          memberMap[key] = (memberMap[key] || 0) + assigne;
        }
      }
      setMemberAssigneByKey(memberMap);
      setPerimeterCota(assignedCotaForRole(role, campaign, assignments, profileScope));
    }
    void loadSelectedCota();
    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId, specialCampaigns, role, profileScope, tab, records]);

  const selectedCampaign =
    specialCampaigns.find((c) => c.id === selectedCampaignId) || null;
  const selectedCampaignLabel = selectedCampaign?.label || null;

  const resolveMemberId = (fullName: string) => {
    const match = members.find((item) => memberFullName(item) === fullName);
    // Les profils responsables n’ont pas d’ID dans public.members → FK collectes_member_id_fkey.
    if (!match || match.source === "profile") return null;
    return match.remoteId || null;
  };

  const memberBalanceFor = (item: CollecteRecord) => {
    const campaignLabel = campaignLabelOf(item);
    if (!campaignLabel) return null;
    const member = members.find((m) => memberFullName(m) === item.membre);
    const memberId = member?.source === "profile" ? null : member?.remoteId || null;
    const engagement = memberId
      ? memberAssigneByKey[`${normalizeLabel(campaignLabel)}::${memberId}`] || 0
      : 0;
    const paye = paidZaimuSpecialForMember(records, item.membre, campaignLabel);
    if (engagement <= 0 && paye <= 0) return null;
    return {
      engagement,
      paye,
      reste: Math.max(0, engagement - paye),
    };
  };

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    for (const item of records) {
      if (item.type !== tab) continue;
      const parts = parseCollecteDateParts(item.date);
      if (parts) years.add(parts.year);
    }
    if (tab === "vague-paix") {
      for (const member of members.filter((m) => m.abonnementVaguePaix)) {
        const parts = parseCollecteDateParts(member.adhesion || "");
        if (parts) years.add(parts.year);
      }
    }
    return [...years].sort((a, b) => b - a);
  }, [records, members, tab]);

  const filtered = useMemo(() => {
    const base =
      tab === "vague-paix"
        ? buildVaguePaixRows(members, records)
        : records.filter((item) => item.type === tab);
    return base
      .filter((item) =>
        tab === "zaimu-special" ? matchesCampaignLabel(item, selectedCampaignLabel) : true,
      )
      .filter((item) => (statutFilter === "Tous" ? true : item.statut === statutFilter))
      .filter((item) => {
        const parts = parseCollecteDateParts(item.date);
        const hasPeriod = Boolean(dateFrom.trim() || dateTo.trim());
        if (hasPeriod) {
          if (!parts) return false;
          if (dateFrom.trim() && parts.iso < dateFrom.trim()) return false;
          if (dateTo.trim() && parts.iso > dateTo.trim()) return false;
          return true;
        }
        if (yearFilter !== "Tous" && parts?.year !== yearFilter) return false;
        if (monthFilter !== "Tous" && parts?.month !== monthFilter) return false;
        return true;
      })
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
      .sort((a, b) => {
        if (tab === "vague-paix") {
          const byGroupe = a.groupe.localeCompare(b.groupe, "fr");
          if (byGroupe !== 0) return byGroupe;
          return a.membre.localeCompare(b.membre, "fr");
        }
        return b.date.localeCompare(a.date);
      });
  }, [
    records,
    members,
    tab,
    search,
    statutFilter,
    selectedCampaignLabel,
    yearFilter,
    monthFilter,
    dateFrom,
    dateTo,
  ]);

  /** KPI branchés sur la liste filtrée (année / mois / période / statut / recherche). */
  const kpis = useMemo(() => {
    if (tab === "vague-paix") {
      const placeholders = filtered.filter((item) => isVaguePaixPlaceholder(item));
      const payments = filtered.filter((item) => !isVaguePaixPlaceholder(item));
      const validated = payments.filter((item) => item.statut === "Validé");
      const uniqueMembers = new Set(filtered.map((item) => normalizeLabel(item.membre)));
      return {
        count: uniqueMembers.size,
        validated: validated.length,
        pending: payments.filter((item) => item.statut === "En attente").length + placeholders.length,
        total: validated.reduce((sum, item) => sum + item.montant, 0),
        aRenseigner: placeholders.length,
      };
    }
    const validated = filtered.filter((item) => item.statut === "Validé");
    const pending = filtered.filter((item) => item.statut === "En attente");
    return {
      count: filtered.length,
      validated: validated.length,
      pending: pending.length,
      total: validated.reduce((sum, item) => sum + item.montant, 0),
      aRenseigner: 0,
    };
  }, [filtered, tab]);

  /** KPI Zaimu spécial : payé / reste / paiements selon les filtres actifs. */
  const zaimuGroupBalance = useMemo(() => {
    if (tab !== "zaimu-special") return null;
    const paye = filtered
      .filter((item) => item.statut === "Validé")
      .reduce((sum, item) => sum + item.montant, 0);
    return {
      engagement: perimeterCota,
      paye,
      reste: Math.max(0, perimeterCota - paye),
      label: perimeterLabelForRole(role),
    };
  }, [tab, filtered, perimeterCota, role]);

  const detail =
    detailId
      ? filtered.find((item) => item.id === detailId) ||
        records.find((item) => item.id === detailId) ||
        null
      : null;
  const detailBalance = detail && detail.type === "zaimu-special" ? memberBalanceFor(detail) : null;

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
      if (values.type === "vague-paix") void reloadMembers();
      return;
    }
    const localNumero = nextLocalId(values.type);
    setRecords((prev) => [
      { id: localNumero, numero: values.numero || localNumero, ...values },
      ...prev,
    ]);
    setCreating(false);
  };

  /** Aligné sur le garde-fou DB : admin / centre / chapitre. */
  const canValidate = role === "admin" || role === "centre" || role === "chapitre";
  /** Paiements validés : modifiables uniquement par admin / centre. */
  const canEditValidated = role === "admin" || role === "centre";
  const canEditCollecte = (item: CollecteRecord) =>
    item.statut !== "Validé" || canEditValidated;
  const canDeleteCollecte = (item: CollecteRecord) =>
    item.statut !== "Validé" || canEditValidated;

  const handleDelete = async (id: string) => {
    if (id.startsWith(VP_PLACEHOLDER_PREFIX)) {
      setActionError(
        "Cet abonné n’a pas encore de paiement. Renseignez un montant plutôt que de supprimer la ligne.",
      );
      return;
    }
    const target = records.find((item) => item.id === id);
    if (!target) return;
    if (!canDeleteCollecte(target)) {
      setActionError(
        "Ce paiement est validé. Seuls le responsable centre ou l’administrateur peuvent le supprimer.",
      );
      return;
    }
    const ok = await confirm({
      title: "Supprimer ce paiement ?",
      description: `L’enregistrement de ${target.membre} (${fmt(target.montant)} FCFA) sera définitivement retiré.`,
      confirmLabel: "Supprimer",
      tone: "danger",
    });
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
    void reloadCollectes();
  };

  const handleValidate = async (item: CollecteRecord) => {
    if (isVaguePaixPlaceholder(item)) {
      setActionError("Renseignez d’abord le montant avant de valider ce paiement Vague de Paix.");
      setEditing(item);
      return;
    }
    if (!canValidate || item.statut !== "En attente") return;
    const ok = await confirm({
      title: "Valider ce paiement ?",
      description: `${item.membre}\nMontant : ${fmt(item.montant)} FCFA\nUne fois validé, seuls le centre ou l’administrateur pourront encore le modifier.`,
      confirmLabel: "Valider",
      tone: "success",
    });
    if (!ok) return;
    setActionError(null);
    const values: Omit<CollecteRecord, "id"> = { ...item, statut: "Validé" };
    if (hasRemoteCollectes()) {
      const { data, error } = await updateCollecteRemote(
        item.id,
        values,
        resolveMemberId(item.membre),
      );
      if (error || !data) {
        setActionError(
          error?.message ||
            "Validation impossible. Seuls admin, centre ou chapitre peuvent valider.",
        );
        return;
      }
      setRecords((prev) => prev.map((row) => (row.id === item.id ? data : row)));
      if (detailId === item.id) setDetailId(null);
      void reloadCollectes();
      if (item.type === "vague-paix") void reloadMembers();
      return;
    }
    setRecords((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, statut: "Validé" } : row)),
    );
    if (detailId === item.id) setDetailId(null);
  };

  const handleUpdate = async (values: Omit<CollecteRecord, "id">) => {
    if (!editing) return;
    // Placeholder abonné VP → créer le premier paiement (montant renseigné).
    if (isVaguePaixPlaceholder(editing)) {
      await handleCreate(values);
      setEditing(null);
      return;
    }
    if (!canEditCollecte(editing)) {
      setActionError(
        "Ce paiement est validé. Seuls le responsable centre ou l’administrateur peuvent le modifier.",
      );
      setEditing(null);
      return;
    }
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
      if (values.type === "vague-paix") void reloadMembers();
      return;
    }
    setRecords((prev) => prev.map((item) => (item.id === editing.id ? { ...item, ...values } : item)));
    setEditing(null);
    setDetailId(null);
  };

  const rowActionsFor = (item: CollecteRecord): RowAction[] => [
    ...(canValidate && item.statut === "En attente" && !isVaguePaixPlaceholder(item)
      ? [
          {
            label: "Valider",
            icon: <CheckCircle size={14} />,
            onClick: () => void handleValidate(item),
          },
        ]
      : []),
    {
      label: "Voir le détail",
      icon: <Eye size={14} />,
      onClick: () => setDetailId(item.id),
    },
    ...(canEditCollecte(item) || isVaguePaixPlaceholder(item)
      ? [
          {
            label: isVaguePaixPlaceholder(item) ? "Renseigner montant" : "Modifier",
            icon: <Edit2 size={14} />,
            onClick: () => setEditing(item),
          },
        ]
      : []),
    ...(canDeleteCollecte(item) && !isVaguePaixPlaceholder(item)
      ? [
          {
            label: "Supprimer",
            icon: <Trash2 size={14} />,
            tone: "danger" as const,
            onClick: () => void handleDelete(item.id),
          },
        ]
      : []),
  ];

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
              <Plus size={15} />{" "}
              {tab === "vague-paix" ? "Renseigner un montant" : "Ajouter"}
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
                  setYearFilter("Tous");
                  setMonthFilter("Tous");
                  setDateFrom("");
                  setDateTo("");
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
        <ZaimuSpecialCampaignsPanel
          role={role}
          collectes={records}
          initialCampaignId={selectedCampaignId}
          onCampaignChange={(id) => {
            if (id) setSelectedCampaignId(id);
          }}
        />
      )}

      {showImportExportPage && (
        <CollectesImportExportBar
          type={tab}
          records={records}
          filteredRecords={filtered}
          orgScope={exportOrgScope}
          balancesById={
            tab === "zaimu-special"
              ? Object.fromEntries(
                  filtered.map((item) => [item.id, memberBalanceFor(item)]),
                )
              : undefined
          }
          onImport={handleImportRecords}
        />
      )}

      {showListPage && (
      <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(tab === "zaimu-special" && zaimuGroupBalance
          ? [
              {
                label: `Cota ${zaimuGroupBalance.label.toLowerCase()}`,
                value: fmt(zaimuGroupBalance.engagement),
                tone: "text-[var(--sgi-blue)]",
                bg: "bg-[var(--sgi-blue)]/10",
                suffix: "FCFA",
              },
              {
                label: "Payé (validé)",
                value: fmt(zaimuGroupBalance.paye),
                tone: "text-emerald-700 dark:text-emerald-400",
                bg: "bg-emerald-500/12",
                suffix: "FCFA",
              },
              {
                label: `Reste ${zaimuGroupBalance.label.toLowerCase()}`,
                value: fmt(zaimuGroupBalance.reste),
                tone: "text-[var(--sgi-red)]",
                bg: "bg-[var(--sgi-red)]/10",
                suffix: "FCFA",
              },
              {
                label: "Paiements",
                value: String(kpis.count),
                tone: "text-[var(--sgi-gold)]",
                bg: "bg-[var(--sgi-gold)]/15",
              },
            ]
          : tab === "vague-paix"
            ? [
                {
                  label: "Abonnés",
                  value: String(kpis.count),
                  tone: "text-[var(--sgi-blue)]",
                  bg: "bg-[var(--sgi-blue)]/10",
                },
                {
                  label: "Montant à renseigner",
                  value: String(kpis.aRenseigner),
                  tone: "text-[var(--sgi-gold)]",
                  bg: "bg-[var(--sgi-gold)]/15",
                },
                {
                  label: "Paiements validés",
                  value: String(kpis.validated),
                  tone: "text-emerald-700 dark:text-emerald-400",
                  bg: "bg-emerald-500/12",
                },
                {
                  label: "Montant validé",
                  value: `${fmt(kpis.total)}`,
                  tone: "text-[var(--sgi-red)]",
                  bg: "bg-[var(--sgi-red)]/10",
                  suffix: "FCFA",
                },
              ]
            : [
                { label: "Enregistrements", value: String(kpis.count), tone: "text-[var(--sgi-blue)]", bg: "bg-[var(--sgi-blue)]/10" },
                { label: "Validés", value: String(kpis.validated), tone: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/12" },
                { label: "En attente", value: String(kpis.pending), tone: "text-[var(--sgi-gold)]", bg: "bg-[var(--sgi-gold)]/15" },
                { label: "Montant validé", value: `${fmt(kpis.total)}`, tone: "text-[var(--sgi-red)]", bg: "bg-[var(--sgi-red)]/10", suffix: "FCFA" },
              ]
        ).map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className={`mb-2 inline-flex rounded-lg p-2 ${kpi.bg} ${kpi.tone}`}>
              <Icon size={15} />
            </div>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`mt-0.5 truncate font-display text-lg font-bold ${kpi.tone}`} style={{ fontFamily: "var(--font-mono)" }}>
              {kpi.value}
            </p>
            {"suffix" in kpi && kpi.suffix && <p className="text-[11px] text-muted-foreground">{kpi.suffix}</p>}
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
          <div className="w-full sm:w-32">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Année</label>
            <select
              className="dash-field"
              value={yearFilter === "Tous" ? "Tous" : String(yearFilter)}
              onChange={(e) => {
                const value = e.target.value;
                setYearFilter(value === "Tous" ? "Tous" : Number(value));
                if (value !== "Tous") {
                  setDateFrom("");
                  setDateTo("");
                }
              }}
              disabled={Boolean(dateFrom || dateTo)}
            >
              <option value="Tous">Toutes</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Mois</label>
            <select
              className="dash-field"
              value={monthFilter === "Tous" ? "Tous" : String(monthFilter)}
              onChange={(e) => {
                const value = e.target.value;
                setMonthFilter(value === "Tous" ? "Tous" : Number(value));
                if (value !== "Tous") {
                  setDateFrom("");
                  setDateTo("");
                }
              }}
              disabled={Boolean(dateFrom || dateTo)}
            >
              <option value="Tous">Tous</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Du</label>
            <input
              type="date"
              className="dash-field"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                const value = e.target.value;
                setDateFrom(value);
                if (value) {
                  setYearFilter("Tous");
                  setMonthFilter("Tous");
                }
              }}
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Au</label>
            <input
              type="date"
              className="dash-field"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                const value = e.target.value;
                setDateTo(value);
                if (value) {
                  setYearFilter("Tous");
                  setMonthFilter("Tous");
                }
              }}
            />
          </div>
          {(yearFilter !== "Tous" || monthFilter !== "Tous" || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setYearFilter("Tous");
                setMonthFilter("Tous");
                setDateFrom("");
                setDateTo("");
              }}
              className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Effacer dates
            </button>
          )}
          {tab === "zaimu-special" && (
            <div className="w-full sm:min-w-[16rem] sm:flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Campagne
              </label>
              <select
                className="dash-field"
                value={selectedCampaignId || ""}
                onChange={(e) => setSelectedCampaignId(e.target.value || null)}
                disabled={specialCampaigns.length === 0}
              >
                {specialCampaigns.length === 0 && (
                  <option value="">Aucune campagne disponible</option>
                )}
                {specialCampaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.label}
                    {campaign.is_active ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {tab === "zaimu-special" && selectedCampaign && (
          <p className="mt-2 text-xs text-muted-foreground">
            Statistiques et liste filtrées sur « {selectedCampaign.label} ».
          </p>
        )}
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
              {tab === "vague-paix"
                ? "Aucun abonné Vague de Paix dans votre périmètre. Cochez la case à la création du membre ou utilisateur."
                : "Aucun enregistrement pour cet onglet."}
            </p>
          )}
          {filtered.map((item) => {
            const balance = tab === "zaimu-special" ? memberBalanceFor(item) : null;
            return (
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
                  {canValidate && item.statut === "En attente" && !isVaguePaixPlaceholder(item) && (
                    <button
                      type="button"
                      onClick={() => void handleValidate(item)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle size={12} />
                      Valider
                    </button>
                  )}
                  <RowActionsMenu actions={rowActionsFor(item)} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{item.date}</span>
                <span className="font-medium text-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                  {isVaguePaixPlaceholder(item) || item.montant <= 0
                    ? "À renseigner"
                    : `${fmt(item.montant)} FCFA`}
                </span>
                <span>{item.groupe}</span>
                {item.referenceRecu?.trim() && (
                  <span className="font-mono text-foreground/80">Reçu {item.referenceRecu}</span>
                )}
                {item.motif && <span>{item.motif}</span>}
                {balance && (
                  <span className="font-semibold text-[var(--sgi-red)]">
                    Reste {fmt(balance.reste)} FCFA
                  </span>
                )}
              </div>
            </article>
            );
          })}
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
                  ...(tab === "zaimu-special" ? ["Reste membre"] : []),
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
                  <td colSpan={tab === "zaimu-special" ? 10 : 9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Aucun enregistrement pour cet onglet.
                  </td>
                </tr>
              )}
              {filtered.map((item) => {
                const balance = tab === "zaimu-special" ? memberBalanceFor(item) : null;
                return (
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
                    {isVaguePaixPlaceholder(item) || item.montant <= 0
                      ? "À renseigner"
                      : fmt(item.montant)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tab === "zaimu-special"
                      ? item.periode || item.motif || "—"
                      : item.periode || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.groupe}</td>
                  {tab === "zaimu-special" && (
                    <td className="px-4 py-3">
                      {balance ? (
                        <div>
                          <div className="font-mono text-sm font-semibold text-[var(--sgi-red)]">
                            {fmt(balance.reste)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {fmt(balance.paye)} / {fmt(balance.engagement)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <StatutPill statut={item.statut} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canValidate && item.statut === "En attente" && !isVaguePaixPlaceholder(item) && (
                        <button
                          type="button"
                          onClick={() => void handleValidate(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          <CheckCircle size={12} />
                          Valider
                        </button>
                      )}
                      <RowActionsMenu actions={rowActionsFor(item)} />
                    </div>
                  </td>
                </tr>
                );
              })}
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
          memberBalance={detailBalance}
          canValidate={canValidate && !isVaguePaixPlaceholder(detail)}
          canEdit={canEditCollecte(detail) || isVaguePaixPlaceholder(detail)}
          canDelete={canDeleteCollecte(detail) && !isVaguePaixPlaceholder(detail)}
          onClose={() => setDetailId(null)}
          onEdit={() => {
            if (!canEditCollecte(detail) && !isVaguePaixPlaceholder(detail)) return;
            setEditing(detail);
            setDetailId(null);
          }}
          onDelete={() => void handleDelete(detail.id)}
          onValidate={() => void handleValidate(detail)}
        />
      )}

      {creating && showListPage && (
        <CollecteFormModal
          title={tab === "vague-paix" ? "Renseigner un montant — Vague de Paix" : `Ajouter — ${meta.short}`}
          initial={emptyForm(tab, memberOptions, selectedCampaignLabel)}
          memberOptions={memberOptions}
          members={members}
          actorRole={role}
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (canEditCollecte(editing) || isVaguePaixPlaceholder(editing)) && (
        <CollecteFormModal
          title={
            isVaguePaixPlaceholder(editing)
              ? "Renseigner le montant — Vague de Paix"
              : "Modifier la collecte"
          }
          initial={editing}
          memberOptions={memberOptions}
          members={members}
          actorRole={role}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
