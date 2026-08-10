import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Download,
  FileUp,
  HeartHandshake,
  Upload,
  Users,
} from "lucide-react";
import type { MemberRecord } from "./memberFormUtils";
import type { PlatformRole } from "./roles";
import ExportFieldsDialog from "./ExportFieldsDialog";
import {
  createMembersFromImport,
  downloadMemberImportTemplate,
  exportMembersExcel,
  exportMembersPdf,
  exportZaimuSpecialExcel,
  exportZaimuSpecialPdf,
  MEMBER_EXPORT_DEFAULT_FIELDS,
  MEMBER_EXPORT_FIELDS,
  parseMembersImportWorkbook,
  ZAIMU_EXPORT_DEFAULT_FIELDS,
  ZAIMU_EXPORT_FIELDS,
  type ZaimuSpecialPaymentRow,
} from "./memberImportExport";
import {
  listMyAssignedSpecialCampaigns,
  listQuotaAssignments,
  listSpecialCampaigns,
} from "../services/quotaService";
import { fetchMyProfile } from "../services/profileService";

type Props = {
  members: MemberRecord[];
  filteredMembers: MemberRecord[];
  collectes: ZaimuSpecialPaymentRow[];
  role: PlatformRole;
  orgScope?: { chapitre?: string; district?: string; groupe?: string; label?: string } | null;
  onImport: (members: MemberRecord[]) => void;
};

type ExportKind = "membres" | "zaimu" | null;

export default function MembersImportExportBar({
  members,
  filteredMembers,
  collectes,
  role,
  orgScope = null,
  onImport,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportKind, setExportKind] = useState<ExportKind>(null);
  const [zsAssigneById, setZsAssigneById] = useState<Record<string, number>>({});
  const [zsPerimeterCota, setZsPerimeterCota] = useState(0);

  const stamp = new Date().toISOString().slice(0, 10);
  const zaimuSpecialCount = collectes.filter((c) => {
    if (c.type !== "zaimu-special") return false;
    const names = new Set(filteredMembers.map((m) => `${m.prenom} ${m.nom}`.trim().toLowerCase()));
    return names.has(c.membre.trim().toLowerCase());
  }).length;

  useEffect(() => {
    let cancelled = false;
    async function loadMemberQuotas() {
      const { data: profile } = await fetchMyProfile();
      const scope = {
        chapitre_id: profile?.chapitre_id || null,
        district_id: profile?.district_id || null,
        groupe_id: profile?.groupe_id || null,
      };

      const assigned = await listMyAssignedSpecialCampaigns({
        role,
        ...scope,
      });
      const perimeter = (assigned.data || [])
        .filter((item) => item.campaign.is_active)
        .reduce((sum, item) => sum + Number(item.assigne || 0), 0);

      const { data: campaigns } = await listSpecialCampaigns();
      const active = (campaigns || []).filter((c) => c.is_active);
      const totals: Record<string, number> = {};
      for (const campaign of active) {
        const { data: assignments } = await listQuotaAssignments(campaign.id);
        for (const row of assignments || []) {
          if (row.level !== "membre" || !row.member_id) continue;
          totals[row.member_id] = (totals[row.member_id] || 0) + Number(row.assigne || 0);
        }
      }

      if (!cancelled) {
        setZsPerimeterCota(perimeter);
        setZsAssigneById(totals);
      }
    }
    void loadMemberQuotas();
    return () => {
      cancelled = true;
    };
  }, [members, role]);

  const finance = { collectes, zsAssigneById, zsPerimeterCota };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const { members: parsed, errors } = parseMembersImportWorkbook(buffer);
      if (!parsed.length) {
        setMessage({
          type: "err",
          text: errors[0] || "Aucun membre valide trouvé dans le fichier. Utilisez le template fourni.",
        });
        return;
      }
      const created = createMembersFromImport(parsed, members);
      onImport(created);
      const suffix = errors.length ? ` (${errors.length} ligne(s) ignorée(s))` : "";
      setMessage({
        type: "ok",
        text: `${created.length} membre(s) importé(s) avec succès${suffix}.`,
      });
    } catch {
      setMessage({
        type: "err",
        text: "Impossible de lire le fichier. Vérifiez qu’il s’agit d’un Excel (.xlsx) conforme au template.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="sgi-tricolor-soft h-1 w-full opacity-80" aria-hidden />
        <div className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Import & export</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cliquez sur Exporter, choisissez les champs à afficher, puis lancez le PDF ou l’Excel.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-[var(--sgi-blue)]/6 px-4 py-3 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sgi-blue)] text-white">
                <Users size={18} />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">1. Liste des membres</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Import via template, ou export avec sélection des champs.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap sm:p-5">
            <button
              type="button"
              onClick={() => downloadMemberImportTemplate()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <Download size={14} />
              Template Excel
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--sgi-blue)]/30 bg-[var(--sgi-blue)]/10 px-3.5 py-2.5 text-sm font-semibold text-[var(--sgi-blue)] transition hover:bg-[var(--sgi-blue)]/15 disabled:opacity-60"
            >
              <Upload size={14} />
              {busy ? "Import…" : "Importer Excel"}
            </button>
            <button
              type="button"
              onClick={() => setExportKind("membres")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-blue)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <FileUp size={14} />
              Exporter…
            </button>
          </div>
          <div className="border-t border-border bg-secondary/25 px-4 py-2.5 text-[11px] text-muted-foreground">
            {filteredMembers.length} membre(s) prêts — choisissez les colonnes à l’export
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-[var(--sgi-red)]/6 px-4 py-3 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sgi-red)] text-white">
                <HeartHandshake size={18} />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">2. Paiements Zaimu spécial</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bilan cota et détail des paiements — champs sélectionnables.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4 sm:flex-row sm:flex-wrap sm:p-5">
            <button
              type="button"
              onClick={() => setExportKind("zaimu")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sgi-red)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <FileUp size={14} />
              Exporter…
            </button>
          </div>
          <div className="border-t border-border bg-secondary/25 px-4 py-2.5 text-[11px] text-muted-foreground">
            {filteredMembers.length} membre(s) · {zaimuSpecialCount} paiement(s)
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            message.type === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-[var(--sgi-red)]/20 bg-[var(--sgi-red)]/10 text-[var(--sgi-red-deep)] dark:text-[var(--sgi-red-soft)]"
          }`}
        >
          {message.text}
        </div>
      )}

      <ExportFieldsDialog
        open={exportKind === "membres"}
        title="Exporter la liste des membres"
        subtitle="Cochez uniquement les champs souhaités dans le document."
        fields={MEMBER_EXPORT_FIELDS}
        defaultSelected={MEMBER_EXPORT_DEFAULT_FIELDS}
        lockedFields={["Prenom", "Nom"]}
        accent="blue"
        onClose={() => setExportKind(null)}
        onExport={({ fields, format }) => {
          if (format === "pdf") {
            exportMembersPdf(filteredMembers, {
              filename: `membres_${stamp}.pdf`,
              fields,
              finance,
              scope: orgScope,
            });
          } else {
            exportMembersExcel(
              filteredMembers,
              `membres_${stamp}.xlsx`,
              fields,
              finance,
              orgScope,
            );
          }
          setExportKind(null);
          setMessage({
            type: "ok",
            text: `Export ${format.toUpperCase()} des membres lancé.`,
          });
        }}
      />

      <ExportFieldsDialog
        open={exportKind === "zaimu"}
        title="Exporter les paiements Zaimu spécial"
        subtitle="Sélectionnez les champs du bilan cota et/ou du détail des paiements."
        fields={ZAIMU_EXPORT_FIELDS}
        defaultSelected={ZAIMU_EXPORT_DEFAULT_FIELDS}
        lockedFields={["Membre", "Reste (FCFA)"]}
        accent="red"
        onClose={() => setExportKind(null)}
        onExport={({ fields, format }) => {
          if (format === "pdf") {
            exportZaimuSpecialPdf(filteredMembers, collectes, {
              filename: `zaimu_special_${stamp}.pdf`,
              fields,
            });
          } else {
            exportZaimuSpecialExcel(filteredMembers, collectes, `zaimu_special_${stamp}.xlsx`, fields);
          }
          setExportKind(null);
          setMessage({
            type: "ok",
            text: `Export ${format.toUpperCase()} Zaimu spécial lancé.`,
          });
        }}
      />

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  );
}
