import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { CollecteRecord, CollecteStatut, CollecteTab } from "./CollectesModule";
import {
  formatExportNumber,
  formatExportOrgScope,
  type ExportFieldOption,
} from "./memberImportExport";

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
  "ReferenceRecu",
  "Note",
] as const;

export type CollecteImportColumn = (typeof COLLECTE_IMPORT_COLUMNS)[number];

export type CollecteExportBalance = {
  engagement: number;
  paye: number;
  reste: number;
};

/** Champs d’export = colonnes de la vue liste (hors Actions). */
export function getCollecteExportFields(type: CollecteTab): ExportFieldOption[] {
  const fields: ExportFieldOption[] = [
    { key: "N°", label: "N°" },
    { key: "Réf. reçu", label: "Réf. reçu" },
    { key: "Date", label: "Date" },
    { key: "Membre", label: "Membre" },
    { key: "Montant", label: "Montant" },
    {
      key: type === "zaimu-special" ? "Campagne" : "Période",
      label: type === "zaimu-special" ? "Campagne" : "Période",
    },
    { key: "Groupe", label: "Groupe" },
  ];
  if (type === "zaimu-special") {
    fields.push({ key: "Reste membre", label: "Reste membre" });
  }
  fields.push({ key: "Statut", label: "Statut" });
  return fields;
}

export function getCollecteExportDefaultFields(type: CollecteTab): string[] {
  return getCollecteExportFields(type).map((f) => f.key);
}

/** @deprecated Préférer getCollecteExportFields(type). */
export const COLLECTE_EXPORT_FIELDS = getCollecteExportFields("zaimu-ordinaire");

/** @deprecated Préférer getCollecteExportDefaultFields(type). */
export const COLLECTE_EXPORT_DEFAULT_FIELDS = getCollecteExportDefaultFields("zaimu-ordinaire");

const EXAMPLE_ROW: Record<CollecteImportColumn, string> = {
  Membre: "Jean-Pierre Kabongo Mwamba",
  Montant: "15000",
  Date: "2026-08-01",
  Statut: "Validé",
  Chapitre: "Rissho Ankoku Ron",
  District: "District Bodhisattva",
  Groupe: "BODDHISATTVA",
  Periode: "Août 2026",
  Motif: "",
  ReferenceRecu: "RC-VP-260801",
  Note: "Exemple — à remplacer",
};

const GUIDE_ROWS = [
  { Champ: "Membre / Montant / Date", Regle: "Obligatoires" },
  { Champ: "Montant", Regle: "Nombre entier (FCFA), sans séparateur" },
  { Champ: "Date", Regle: "Format AAAA-MM-JJ" },
  { Champ: "Statut", Regle: "En attente | Validé | Annulé" },
  { Champ: "ReferenceRecu", Regle: "Optionnel — référence du reçu papier / mobile money" },
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

/** Libellé de périmètre à partir des collectes exportées. */
export function inferCollecteExportOrgScope(records: CollecteRecord[]): string {
  const unique = (values: string[]) =>
    [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  const chapitres = unique(records.map((r) => r.chapitre));
  const districts = unique(records.map((r) => r.district));
  const groupes = unique(records.map((r) => r.groupe));

  const parts: string[] = [];
  if (chapitres.length === 1) parts.push(`Chapitre ${chapitres[0]}`);
  else if (chapitres.length > 1) parts.push(`${chapitres.length} chapitres`);
  if (districts.length === 1) parts.push(`District ${districts[0]}`);
  else if (districts.length > 1) parts.push(`${districts.length} districts`);
  if (groupes.length === 1) parts.push(`Groupe ${groupes[0]}`);
  else if (groupes.length > 1) parts.push(`${groupes.length} groupes`);

  return parts.length > 0 ? parts.join(" · ") : "Périmètre non précisé";
}

function resolveCollecteScopeLabel(
  records: CollecteRecord[],
  scope?: { chapitre?: string; district?: string; groupe?: string; label?: string } | null,
) {
  const inferred = inferCollecteExportOrgScope(records);
  if (inferred !== "Périmètre non précisé") return inferred;
  return formatExportOrgScope(scope) || inferred;
}

/** Conserve l’ordre des colonnes de la vue liste. */
function orderSelectedFields(fields: string[], catalog: string[]) {
  const selected = new Set(fields);
  const ordered = catalog.filter((key) => selected.has(key));
  for (const key of fields) {
    if (!ordered.includes(key)) ordered.push(key);
  }
  return ordered;
}

export function collecteToExportRow(
  record: CollecteRecord,
  options?: {
    type?: CollecteTab;
    balance?: CollecteExportBalance | null;
  },
): Record<string, string | number> {
  const type = options?.type || record.type;
  const campagneOuPeriode =
    type === "zaimu-special"
      ? record.periode || record.motif || ""
      : record.periode || "";
  const row: Record<string, string | number> = {
    "N°": record.numero?.trim() || record.id,
    "Réf. reçu": record.referenceRecu || "",
    Date: record.date,
    Membre: record.membre,
    Montant: record.montant,
    Groupe: record.groupe,
    Statut: record.statut,
  };
  if (type === "zaimu-special") {
    row.Campagne = campagneOuPeriode;
    const balance = options?.balance;
    row["Reste membre"] = balance
      ? `${Math.round(balance.reste)} (${Math.round(balance.paye)} / ${Math.round(balance.engagement)})`
      : "";
  } else {
    row.Période = campagneOuPeriode;
  }
  return row;
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
      numero: "",
      type,
      membre,
      montant: Math.round(montant),
      date,
      statut,
      chapitre: cell(row, "Chapitre") || "Rissho Ankoku Ron",
      district: cell(row, "District") || "District Bodhisattva",
      groupe: cell(row, "Groupe") || "BODDHISATTVA",
      periode: cell(row, "Periode") || cell(row, "Période") || "",
      motif: cell(row, "Motif"),
      referenceRecu:
        cell(row, "ReferenceRecu") ||
        cell(row, "Référence reçu") ||
        cell(row, "Reference reçu") ||
        "",
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
    const numero = `${prefix}-${year}-${String(sequence).padStart(3, "0")}`;
    return {
      id: numero,
      ...values,
      numero: values.numero || numero,
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
  fields?: string[],
  options?: {
    type?: CollecteTab;
    balancesById?: Record<string, CollecteExportBalance | null | undefined>;
    scope?: { chapitre?: string; district?: string; groupe?: string; label?: string } | null;
  },
) {
  const type = options?.type || records[0]?.type || "zaimu-ordinaire";
  const catalog = getCollecteExportDefaultFields(type);
  const selected = orderSelectedFields(fields?.length ? fields : catalog, catalog);
  const scopeLabel = resolveCollecteScopeLabel(records, options?.scope);
  const typeLabel = COLLECTE_TYPE_LABELS[type];
  const totalValide = records
    .filter((r) => r.statut === "Validé")
    .reduce((sum, r) => sum + r.montant, 0);
  const rows = records.map((r) => {
    const full = collecteToExportRow(r, {
      type,
      balance: options?.balancesById?.[r.id],
    });
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
  const summarySheet = XLSX.utils.json_to_sheet([
    { Indicateur: "Type", Valeur: typeLabel },
    { Indicateur: "Périmètre", Valeur: scopeLabel },
    { Indicateur: "Lignes exportées", Valeur: records.length },
    { Indicateur: "Validés", Valeur: records.filter((r) => r.statut === "Validé").length },
    { Indicateur: "Total validé (FCFA)", Valeur: Math.round(totalValide) },
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Synthese");
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
    type?: CollecteTab;
    balancesById?: Record<string, CollecteExportBalance | null | undefined>;
    scope?: { chapitre?: string; district?: string; groupe?: string; label?: string } | null;
  }
) {
  const type = options.type || records[0]?.type || "zaimu-ordinaire";
  const fieldDefs = getCollecteExportFields(type);
  const catalog = getCollecteExportDefaultFields(type);
  const selected = orderSelectedFields(
    options.fields?.length ? options.fields : catalog,
    catalog,
  );
  const labels = Object.fromEntries(fieldDefs.map((f) => [f.key, f.label]));
  const scopeLabel = resolveCollecteScopeLabel(records, options.scope);
  const generatedAt = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const rows = records.map((r) =>
    pickFields(
      collecteToExportRow(r, {
        type,
        balance: options.balancesById?.[r.id],
      }),
      selected,
    ),
  );
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const margin = 36;
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(10, 47, 82);
  doc.rect(0, 0, pageW, 72, "F");
  const band = pageW / 3;
  doc.setFillColor(10, 47, 82);
  doc.rect(0, 72, band, 4, "F");
  doc.setFillColor(200, 151, 26);
  doc.rect(band, 72, band, 4, "F");
  doc.setFillColor(194, 58, 43);
  doc.rect(band * 2, 72, band, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Centre Miroir Parfait — Collectes", margin, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(sanitizeText(`${options.typeLabel} · ${options.title}`), margin, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 230, 170);
  const scopeText = scopeLabel.toLowerCase().startsWith("périmètre")
    ? scopeLabel
    : `Périmètre : ${scopeLabel}`;
  doc.text(sanitizeText(scopeText), margin, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 230, 240);
  doc.text(sanitizeText(`Généré le ${generatedAt}`), margin, 66);

  let y = 96;
  doc.setTextColor(16, 32, 51);
  doc.setFontSize(10);
  const total = records
    .filter((r) => r.statut === "Validé")
    .reduce((sum, r) => sum + r.montant, 0);
  doc.text(
    `${records.length} ligne(s) · Total validé ${formatExportNumber(total)} FCFA · ${selected.length} champ(s)`,
    margin,
    y
  );
  y += 20;

  const usable = pageW - margin * 2;
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

  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(220, 226, 234);
    doc.setLineWidth(0.7);
    doc.line(margin, pageH - 30, pageW - margin, pageH - 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizeText(`Périmètre : ${scopeLabel}`), margin, pageH - 16);
    doc.text(`Page ${i} / ${pageCount}`, pageW - margin, pageH - 16, { align: "right" });
  }

  doc.save(options.filename);
}
