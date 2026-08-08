import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { CollecteRecord, CollecteStatut, CollecteTab } from "./CollectesModule";
import { formatExportNumber, type ExportFieldOption } from "./memberImportExport";

export const COLLECTE_TYPE_LABELS: Record<CollecteTab, string> = {
  "vague-paix": "Vague de Paix",
  "zaimu-ordinaire": "Zaimu ordinaire",
  "zaimu-special": "Zaimu spéciaux",
};

export const COLLECTE_IMPORT_COLUMNS = [
  "Membre",
  "Montant",
  "Date",
  "Statut",
  "Chapitre",
  "District",
  "Groupe",
  "Periode",
  "Motif",
  "Note",
] as const;

export type CollecteImportColumn = (typeof COLLECTE_IMPORT_COLUMNS)[number];

export const COLLECTE_EXPORT_FIELDS: ExportFieldOption[] = [
  { key: "Référence", label: "Référence" },
  { key: "Membre", label: "Membre" },
  { key: "Montant (CDF)", label: "Montant" },
  { key: "Date", label: "Date" },
  { key: "Statut", label: "Statut" },
  { key: "Chapitre", label: "Chapitre" },
  { key: "District", label: "District" },
  { key: "Groupe", label: "Groupe" },
  { key: "Période", label: "Période" },
  { key: "Motif", label: "Motif" },
  { key: "Note", label: "Note" },
];

export const COLLECTE_EXPORT_DEFAULT_FIELDS = [
  "Référence",
  "Membre",
  "Montant (CDF)",
  "Date",
  "Statut",
  "Chapitre",
  "District",
  "Groupe",
  "Période",
  "Motif",
];

const EXAMPLE_ROW: Record<CollecteImportColumn, string> = {
  Membre: "Jean-Pierre Kabongo Mwamba",
  Montant: "15000",
  Date: "2026-08-01",
  Statut: "Validé",
  Chapitre: "Chapitre 1 – Kinshasa",
  District: "District Nord",
  Groupe: "Groupe A",
  Periode: "Août 2026",
  Motif: "",
  Note: "Exemple — à remplacer",
};

const GUIDE_ROWS = [
  { Champ: "Membre / Montant / Date", Regle: "Obligatoires" },
  { Champ: "Montant", Regle: "Nombre entier (CDF), sans séparateur" },
  { Champ: "Date", Regle: "Format AAAA-MM-JJ" },
  { Champ: "Statut", Regle: "En attente | Validé | Annulé" },
  { Champ: "Motif", Regle: "Recommandé pour Zaimu spécial" },
  { Champ: "Type", Regle: "Défini automatiquement par l’onglet actif à l’import" },
];

function cell(row: Record<string, unknown>, key: string) {
  const exact = row[key];
  if (exact !== undefined && exact !== null && String(exact).trim() !== "") return String(exact).trim();
  const found = Object.entries(row).find(([k]) => k.trim().toLowerCase() === key.toLowerCase());
  return found ? String(found[1] ?? "").trim() : "";
}

function sanitizeText(value: string) {
  return value.replace(/[\u00a0\u202f\u2007\u2009]/g, " ");
}

function ensureLeadingMember(fields: string[]) {
  const rest = fields.filter((f) => f !== "Membre");
  return ["Membre", ...rest];
}

export function collecteToExportRow(record: CollecteRecord): Record<string, string | number> {
  return {
    Référence: record.id,
    Membre: record.membre,
    "Montant (CDF)": record.montant,
    Date: record.date,
    Statut: record.statut,
    Chapitre: record.chapitre,
    District: record.district,
    Groupe: record.groupe,
    Période: record.periode,
    Motif: record.motif,
    Note: record.note,
  };
}

export function downloadCollecteImportTemplate(
  type: CollecteTab,
  filename = `template_import_${type}.xlsx`
) {
  const workbook = XLSX.utils.book_new();
  const example = {
    ...EXAMPLE_ROW,
    Montant: type === "vague-paix" ? "15000" : type === "zaimu-ordinaire" ? "25000" : "100000",
    Motif: type === "zaimu-special" ? "Campagne centre" : "",
    Periode: type === "zaimu-special" ? "Campagne 2026" : "Août 2026",
  };
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([example], { header: [...COLLECTE_IMPORT_COLUMNS] }),
    "Collectes"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { Champ: "Type d’opération", Regle: COLLECTE_TYPE_LABELS[type] },
      ...GUIDE_ROWS,
    ]),
    "Instructions"
  );
  XLSX.writeFile(workbook, filename);
}

export type ParsedCollecteImport = Omit<CollecteRecord, "id">;

export function parseCollectesImportWorkbook(
  data: ArrayBuffer,
  type: CollecteTab
): { records: ParsedCollecteImport[]; errors: string[] } {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames.includes("Collectes") ? "Collectes" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const records: ParsedCollecteImport[] = [];
  const errors: string[] = [];
  const allowedStatuts: CollecteStatut[] = ["En attente", "Validé", "Annulé"];

  rows.forEach((row, index) => {
    const line = index + 2;
    const membre = cell(row, "Membre");
    const montantRaw = cell(row, "Montant").replace(/\s/g, "").replace(",", ".");
    const date = cell(row, "Date");

    if (!membre && !montantRaw && !date) return;

    if (!membre || !montantRaw || !date) {
      errors.push(`Ligne ${line} : Membre, Montant et Date sont obligatoires.`);
      return;
    }

    const montant = Number(montantRaw);
    if (!Number.isFinite(montant) || montant < 0) {
      errors.push(`Ligne ${line} : Montant invalide (${montantRaw}).`);
      return;
    }

    const statutRaw = cell(row, "Statut") || "En attente";
    const statut = (allowedStatuts.includes(statutRaw as CollecteStatut)
      ? statutRaw
      : "En attente") as CollecteStatut;

    records.push({
      type,
      membre,
      montant: Math.round(montant),
      date,
      statut,
      chapitre: cell(row, "Chapitre") || "Chapitre 1 – Kinshasa",
      district: cell(row, "District") || "District Nord",
      groupe: cell(row, "Groupe") || "Groupe A",
      periode: cell(row, "Periode") || cell(row, "Période") || "",
      motif: cell(row, "Motif"),
      note: cell(row, "Note"),
    });
  });

  return { records, errors };
}

export function createCollectesFromImport(
  imported: ParsedCollecteImport[],
  existing: CollecteRecord[],
  type: CollecteTab
): CollecteRecord[] {
  const prefix = type === "vague-paix" ? "VP" : type === "zaimu-ordinaire" ? "ZO" : "ZS";
  const year = new Date().getFullYear();
  let sequence = existing.filter((item) => item.type === type).length;
  return imported.map((values) => {
    sequence += 1;
    return {
      id: `${prefix}-${year}-${String(sequence).padStart(3, "0")}`,
      ...values,
      type,
    };
  });
}

function pickFields(row: Record<string, string | number>, fields: string[]) {
  const out: Record<string, string | number> = {};
  for (const key of fields) out[key] = row[key] ?? "";
  return out;
}

export function exportCollectesExcel(
  records: CollecteRecord[],
  filename: string,
  fields: string[] = COLLECTE_EXPORT_DEFAULT_FIELDS
) {
  const selected = ensureLeadingMember(fields.length ? fields : COLLECTE_EXPORT_DEFAULT_FIELDS);
  const rows = records.map((r) => {
    const full = collecteToExportRow(r);
    const picked = pickFields(full, selected);
    const sanitized: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(picked)) {
      sanitized[key] =
        typeof value === "number" && Number.isFinite(value)
          ? Math.round(value)
          : sanitizeText(String(value ?? ""));
    }
    return sanitized;
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      rows.length ? rows : [Object.fromEntries(selected.map((c) => [c, ""]))],
      { header: selected }
    ),
    "Collectes"
  );
  XLSX.writeFile(workbook, filename);
}

export function exportCollectesPdf(
  records: CollecteRecord[],
  options: {
    title: string;
    typeLabel: string;
    filename: string;
    fields?: string[];
  }
) {
  const selected = ensureLeadingMember(
    options.fields?.length ? options.fields : COLLECTE_EXPORT_DEFAULT_FIELDS
  );
  const labels = Object.fromEntries(COLLECTE_EXPORT_FIELDS.map((f) => [f.key, f.label]));
  const rows = records.map((r) => pickFields(collecteToExportRow(r), selected));
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const margin = 36;
  let y = 40;

  doc.setFillColor(10, 47, 82);
  doc.rect(0, 0, 842, 58, "F");
  doc.setFillColor(200, 151, 26);
  doc.rect(0, 58, 280, 3, "F");
  doc.setFillColor(194, 58, 43);
  doc.rect(280, 58, 562, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("Centre Miroir Parfait — Collectes", margin, 28);
  doc.setFontSize(10);
  doc.text(`${options.typeLabel} · ${options.title}`, margin, 46);

  y = 84;
  doc.setTextColor(16, 32, 51);
  doc.setFontSize(10);
  const total = records
    .filter((r) => r.statut === "Validé")
    .reduce((sum, r) => sum + r.montant, 0);
  doc.text(
    `${records.length} ligne(s) · Total validé ${formatExportNumber(total)} CDF · ${selected.length} champ(s)`,
    margin,
    y
  );
  y += 20;

  const usable = 842 - margin * 2;
  const widths = selected.map((key) =>
    key.includes("Montant") || key === "Membre" ? 1.35 : 1
  );
  const weightSum = widths.reduce((a, b) => a + b, 0);
  const colW = widths.map((w) => (usable * w) / weightSum);

  let x = margin;
  doc.setFillColor(10, 47, 82);
  doc.rect(margin, y - 11, usable, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  selected.forEach((key, i) => {
    doc.text((labels[key] || key).slice(0, Math.max(4, Math.floor(colW[i] / 4.2))), x + 2, y);
    x += colW[i];
  });
  y += 16;
  doc.setTextColor(16, 32, 51);

  rows.forEach((row, index) => {
    if (y > 560) {
      doc.addPage();
      y = 40;
    }
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 10, usable, 16, "F");
    }
    x = margin;
    selected.forEach((key, i) => {
      const raw = row[key];
      const text =
        typeof raw === "number" ? formatExportNumber(raw) : sanitizeText(String(raw ?? ""));
      const maxChars =
        key.includes("Montant")
          ? Math.max(text.length, Math.floor(colW[i] / 3.6))
          : Math.max(6, Math.floor(colW[i] / 4.2));
      doc.text(text.slice(0, maxChars), x + 2, y);
      x += colW[i];
    });
    y += 15;
  });

  doc.save(options.filename);
}
