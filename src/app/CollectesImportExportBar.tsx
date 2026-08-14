import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Download, FileUp, Upload } from "lucide-react";
import type { CollecteRecord, CollecteTab } from "./CollectesModule";
import type { MemberRecord } from "./memberFormUtils";
import ExportFieldsDialog from "./ExportFieldsDialog";
import {
  COLLECTE_TYPE_LABELS,
  createCollectesFromImport,
  downloadCollecteImportTemplate,
  exportCollectesExcel,
  exportCollectesPdf,
  getCollecteExportDefaultFields,
  getCollecteExportFields,
  parseCollectesImportWorkbook,
  type CollecteExportBalance,
} from "./collecteImportExport";
import {
  exportZaimuSpecialExcel,
  exportZaimuSpecialPdf,
  ZAIMU_EXPORT_DEFAULT_FIELDS,
  ZAIMU_EXPORT_FIELDS,
} from "./memberImportExport";

type Props = {
  type: CollecteTab;
  records: CollecteRecord[];
  filteredRecords: CollecteRecord[];
  members?: MemberRecord[];
  balancesById?: Record<string, CollecteExportBalance | null | undefined>;
  orgScope?: { chapitre?: string; district?: string; groupe?: string; label?: string } | null;
  onImport: (records: CollecteRecord[]) => void;
};

export default function CollectesImportExportBar({
  type,
  records,
  filteredRecords,
  members = [],
  balancesById,
  orgScope = null,
  onImport,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const typeLabel = COLLECTE_TYPE_LABELS[type];
  const stamp = new Date().toISOString().slice(0, 10);
  const isZaimuSpecial = type === "zaimu-special";
  const listFields = useMemo(() => getCollecteExportFields(type), [type]);
  const exportFields = useMemo(() => {
    if (!isZaimuSpecial) return listFields;
    const used = new Set(listFields.map((field) => field.key));
    return [
      ...listFields,
      ...ZAIMU_EXPORT_FIELDS.filter((field) => !used.has(field.key)),
    ];
  }, [isZaimuSpecial, listFields]);
  const exportDefaults = useMemo(
    () => getCollecteExportDefaultFields(type),
    [type],
  );

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const { records: parsed, errors } = parseCollectesImportWorkbook(buffer, type);
      if (!parsed.length) {
        setMessage({
          type: "err",
          text: errors[0] || "Aucune ligne valide. Utilisez le template fourni.",
        });
        return;
      }
      const created = createCollectesFromImport(parsed, records, type);
      onImport(created);
      const suffix = errors.length ? ` (${errors.length} ligne(s) ignorée(s))` : "";
      setMessage({
        type: "ok",
        text: `${created.length} enregistrement(s) importé(s) en ${typeLabel}${suffix}.`,
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
          <p className="text-sm font-semibold text-foreground">Import & export · {typeLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Téléchargez le template, importez des paiements, ou exportez la liste filtrée (PDF / Excel).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => downloadCollecteImportTemplate(type)}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition hover:border-[var(--sgi-blue)]/40 hover:bg-[var(--sgi-blue)]/[0.03]"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sgi-blue)]/10 text-[var(--sgi-blue)]">
            <Download size={16} />
          </span>
          <span className="text-sm font-semibold text-foreground">Template Excel</span>
          <span className="text-xs text-muted-foreground">
            Colonnes prêtes pour {typeLabel}.
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition hover:border-[var(--sgi-gold)]/50 hover:bg-[var(--sgi-gold)]/[0.04] disabled:opacity-60"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sgi-gold)]/15 text-[var(--sgi-gold)]">
            <Upload size={16} />
          </span>
          <span className="text-sm font-semibold text-foreground">Importer</span>
          <span className="text-xs text-muted-foreground">
            Ajoute les lignes au type d’opération actif.
          </span>
        </button>

        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left transition hover:border-[var(--sgi-red)]/40 hover:bg-[var(--sgi-red)]/[0.03]"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sgi-red)]/10 text-[var(--sgi-red)]">
            <FileUp size={16} />
          </span>
          <span className="text-sm font-semibold text-foreground">Exporter</span>
          <span className="text-xs text-muted-foreground">
            {isZaimuSpecial
              ? `${members.length} membre(s) · ${filteredRecords.length} paiement(s) · bilan cota et détail.`
              : `${filteredRecords.length} ligne(s) filtrée(s) · choix des champs.`}
          </span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleImportFile}
      />

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <ExportFieldsDialog
        open={exportOpen}
        title={`Exporter · ${typeLabel}`}
        subtitle={`${filteredRecords.length} enregistrement(s) · cochez les colonnes du tableau à inclure.`}
        fields={exportFields}
        defaultSelected={exportDefaults}
        lockedFields={["Membre"]}
        accent={isZaimuSpecial ? "red" : "blue"}
        onClose={() => setExportOpen(false)}
        onExport={({ fields, format }) => {
          const listKeys = new Set(listFields.map((field) => field.key));
          const listSelected = fields.filter((key) => listKeys.has(key));
          const zaimuOnlyKeys = new Set(
            ZAIMU_EXPORT_FIELDS.filter((field) => !listKeys.has(field.key)).map((field) => field.key),
          );
          const wantsZaimuSheets = isZaimuSpecial && fields.some((key) => zaimuOnlyKeys.has(key));
          const base = `collectes_${type}_${stamp}`;

          if (listSelected.length) {
            if (format === "excel") {
              exportCollectesExcel(filteredRecords, `${base}.xlsx`, listSelected, {
                type,
                balancesById,
                scope: orgScope,
              });
            } else {
              exportCollectesPdf(filteredRecords, {
                title: "Liste filtrée",
                typeLabel,
                filename: `${base}.pdf`,
                fields: listSelected,
                type,
                balancesById,
                scope: orgScope,
              });
            }
          }

          if (wantsZaimuSheets) {
            const zaimuFields = fields.filter((key) =>
              ZAIMU_EXPORT_FIELDS.some((field) => field.key === key),
            );
            if (format === "pdf") {
              exportZaimuSpecialPdf(members, filteredRecords, {
                filename: `zaimu_special_${stamp}.pdf`,
                fields: zaimuFields.length ? zaimuFields : ZAIMU_EXPORT_DEFAULT_FIELDS,
              });
            } else {
              exportZaimuSpecialExcel(
                members,
                filteredRecords,
                `zaimu_special_${stamp}.xlsx`,
                zaimuFields.length ? zaimuFields : ZAIMU_EXPORT_DEFAULT_FIELDS,
              );
            }
          }

          setExportOpen(false);
          setMessage({
            type: "ok",
            text: `Export ${format.toUpperCase()} ${typeLabel} lancé.`,
          });
        }}
      />
    </div>
  );
}
