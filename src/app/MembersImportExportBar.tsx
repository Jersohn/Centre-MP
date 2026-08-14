import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Download,
  FileUp,
  HeartHandshake,
  Upload,
  Users,
} from "lucide-react";
import { memberToFormValues, type MemberRecord } from "./memberFormUtils";
import { memberFullName } from "./membersData";
import type { PlatformRole } from "./roles";
import ExportFieldsDialog from "./ExportFieldsDialog";
import {
  applyMembersImport,
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
  createMemberRemote,
  hasRemoteMembers,
  updateMemberRemote,
} from "../services/memberService";
import { resolveOrgIds } from "../services/orgService";
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
  onImport: (payload: { created: MemberRecord[]; updated: MemberRecord[] }) => void;
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
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string; details?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
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
    setProgress({ current: 0, total: 1, label: "Lecture du fichier…" });
    try {
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const parsedSource = isCsv ? await file.text() : await file.arrayBuffer();
      const { members: parsed, errors } = parseMembersImportWorkbook(parsedSource);
      if (!parsed.length) {
        setMessage({
          type: "err",
          text: errors[0] || "Aucun membre valide trouvé dans le fichier. Vérifiez les colonnes Prénom / Nom (ou Email).",
          details: errors.slice(0, 12),
        });
        return;
      }

      const { created, updated } = applyMembersImport(parsed, members);
      const persistErrors: string[] = [...errors];
      let createdOk = 0;
      let updatedOk = 0;
      const orgCache = new Map<string, { chapitre_id: string; district_id: string; groupe_id: string } | null>();

      const resolveOrg = async (member: MemberRecord) => {
        if (member.chapitreId && member.districtId && member.groupeId) {
          return {
            chapitre_id: member.chapitreId,
            district_id: member.districtId,
            groupe_id: member.groupeId,
          };
        }
        const key = `${member.chapitre}|${member.district}|${member.groupe}`;
        if (orgCache.has(key)) return orgCache.get(key) || null;
        const resolved = await resolveOrgIds({
          chapitre: member.chapitre,
          district: member.district,
          groupe: member.groupe,
        });
        const ids =
          resolved.data.chapitre_id && resolved.data.district_id && resolved.data.groupe_id
            ? {
                chapitre_id: resolved.data.chapitre_id,
                district_id: resolved.data.district_id,
                groupe_id: resolved.data.groupe_id,
              }
            : null;
        orgCache.set(key, ids);
        return ids;
      };

      const queue = [
        ...updated.map((member) => ({ member, kind: "update" as const })),
        ...created.map((member) => ({ member, kind: "create" as const })),
      ];
      const total = Math.max(queue.length, 1);

      if (hasRemoteMembers()) {
        for (let index = 0; index < queue.length; index += 1) {
          const { member, kind } = queue[index];
          setProgress({
            current: index + 1,
            total,
            label:
              kind === "update"
                ? `Mise à jour ${index + 1}/${total} — ${memberFullName(member) || member.email}`
                : `Enregistrement ${index + 1}/${total} — ${memberFullName(member) || member.email}`,
          });
          await new Promise((resolve) => window.setTimeout(resolve, 0));
          if (kind === "update") {
            if (!member.remoteId || member.source === "profile") {
              persistErrors.push(
                `${memberFullName(member) || member.email} : fiche responsable non modifiable par import.`,
              );
              continue;
            }
            const orgIds = await resolveOrg(member);
            const { error } = await updateMemberRemote(member.remoteId, memberToFormValues(member), orgIds);
            if (error) persistErrors.push(`${memberFullName(member)} : ${error.message}`);
            else updatedOk += 1;
            continue;
          }

          if (!member.prenom.trim() || !member.nom.trim()) {
            persistErrors.push(
              `${member.email || "Nouveau membre"} : prénom et nom sont requis pour créer une fiche.`,
            );
            continue;
          }
          const orgIds = await resolveOrg(member);
          const { error } = await createMemberRemote(memberToFormValues(member), orgIds);
          if (error) persistErrors.push(`${memberFullName(member)} : ${error.message}`);
          else createdOk += 1;
        }
      } else {
        createdOk = created.length;
        updatedOk = updated.length;
      }

      setProgress({ current: total, total, label: "Finalisation…" });
      onImport({ created, updated });
      setMessage({
        type: createdOk + updatedOk > 0 ? "ok" : "err",
        text:
          createdOk + updatedOk > 0
            ? `${createdOk} membre(s) créé(s), ${updatedOk} mis à jour.${persistErrors.length ? ` ${persistErrors.length} ligne(s) en alerte.` : ""}`
            : persistErrors[0] || "Aucun membre n’a pu être enregistré.",
        details: persistErrors.slice(0, 20),
      });
    } catch (error) {
      setMessage({
        type: "err",
        text:
          error instanceof Error
            ? `Import impossible : ${error.message}`
            : "Impossible de lire le fichier. Utilisez un Excel (.xlsx) ou un CSV.",
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="sgi-tricolor-soft h-1 w-full opacity-80" aria-hidden />
        <div className="p-4 sm:p-5">
          <p className="text-sm font-semibold text-foreground">Import & export</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Importez un Excel/CSV (une barre de progression s’affiche), ou exportez la liste filtrée.
          </p>
        </div>
      </div>

      {progress && (
        <div className="rounded-xl border border-[var(--sgi-blue)]/25 bg-[var(--sgi-blue)]/8 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <p className="font-medium text-foreground">{progress.label}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {progress.current}/{progress.total}
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--sgi-blue)] transition-all"
              style={{ width: `${Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {message && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm ${
            message.type === "ok"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-[var(--sgi-red)]/20 bg-[var(--sgi-red)]/10 text-[var(--sgi-red-deep)] dark:text-[var(--sgi-red-soft)]"
          }`}
        >
          <p>{message.text}</p>
          {message.details && message.details.length > 0 && (
            <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-xs opacity-90">
              {message.details.map((detail, index) => (
                <li key={`${index}-${detail}`}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}

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
                  Import via template (champs optionnels), ou export avec sélection des champs.
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
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  );
}
