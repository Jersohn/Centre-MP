import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { MemberRecord } from "./memberFormUtils";
import { memberFullName } from "./membersData";
import {
  getMemberSpecialAssignment,
  getMemberZaimuPaid,
  ZAIMU_SPECIAL_CAMPAIGN,
  type CollectePayment,
} from "./zaimuQuota";

export type ZaimuSpecialPaymentRow = CollectePayment & {
  id?: string;
  motif?: string;
  periode?: string;
  date?: string;
  referenceRecu?: string;
};

export const MEMBER_IMPORT_COLUMNS = [
  "Prenom",
  "Nom",
  "Email",
  "Telephone",
  "DateNaissance",
  "Departement",
  "Categorie",
  "Responsabilite",
  "DateDebutPratique",
  "VagueDePaix",
  "Gohonzon",
  "Sokahan",
  "Quartier",
  "Chapitre",
  "District",
  "Groupe",
  "Statut",
  "Abonnement",
  "DateAdhesion",
] as const;

export type MemberImportColumn = (typeof MEMBER_IMPORT_COLUMNS)[number];

export type ExportFieldOption = { key: string; label: string; group?: string };

export const MEMBER_EXPORT_FIELDS: ExportFieldOption[] = [
  { key: "Prenom", label: "Prénom" },
  { key: "Nom", label: "Nom" },
  { key: "Email", label: "Email" },
  { key: "Telephone", label: "Téléphone" },
  { key: "DateNaissance", label: "Date de naissance" },
  { key: "Departement", label: "Département" },
  { key: "Categorie", label: "Catégorie" },
  { key: "Responsabilite", label: "Responsabilité" },
  { key: "DateDebutPratique", label: "Début de pratique" },
  { key: "ZaimuOrd", label: "Zaimu ord." },
  { key: "ZaimuSp", label: "Zaimu sp. (payé/cota)" },
  { key: "VagueDePaix", label: "Vague de Paix" },
  { key: "Gohonzon", label: "Gohonzon" },
  { key: "Sokahan", label: "Sokahan" },
  { key: "Quartier", label: "Quartier" },
  { key: "Chapitre", label: "Chapitre" },
  { key: "District", label: "District" },
  { key: "Groupe", label: "Groupe" },
  { key: "Statut", label: "Statut" },
  { key: "Abonnement", label: "Abonnement" },
  { key: "DateAdhesion", label: "Date d’adhésion" },
];

export const MEMBER_EXPORT_DEFAULT_FIELDS = [
  "Prenom",
  "Nom",
  "Email",
  "Responsabilite",
  "Chapitre",
  "District",
  "Groupe",
  "Departement",
  "Statut",
  "ZaimuOrd",
  "ZaimuSp",
  "VagueDePaix",
  "Gohonzon",
  "Sokahan",
];

const MEMBER_DEPARTEMENT_VALUES = ["Homme", "Femme", "Jeune homme", "Jeune fille", "Avenir"] as const;

function memberDepartementLabel(member: MemberRecord) {
  return (member.departement || member.categorie || "").trim();
}

export const ZAIMU_BILAN_EXPORT_FIELDS: ExportFieldOption[] = [
  { key: "Membre", label: "Membre", group: "Bilan cota" },
  { key: "Email", label: "Email", group: "Bilan cota" },
  { key: "Chapitre", label: "Chapitre", group: "Bilan cota" },
  { key: "District", label: "District", group: "Bilan cota" },
  { key: "Groupe", label: "Groupe", group: "Bilan cota" },
  { key: "Cota assignée (FCFA)", label: "Cota assignée", group: "Bilan cota" },
  { key: "Payé validé (FCFA)", label: "Payé validé", group: "Bilan cota" },
  { key: "Reste (FCFA)", label: "Montant restant", group: "Bilan cota" },
  { key: "Nb paiements", label: "Nb paiements", group: "Bilan cota" },
  { key: "Dernier paiement", label: "Dernier paiement", group: "Bilan cota" },
  { key: "Statut cota", label: "Statut cota", group: "Bilan cota" },
];

export const ZAIMU_PAYMENT_EXPORT_FIELDS: ExportFieldOption[] = [
  { key: "Référence", label: "N° enregistrement", group: "Paiements" },
  { key: "Référence reçu", label: "Référence reçu", group: "Paiements" },
  { key: "Date", label: "Date", group: "Paiements" },
  { key: "Membre", label: "Membre", group: "Paiements" },
  { key: "Montant (FCFA)", label: "Montant", group: "Paiements" },
  { key: "Statut", label: "Statut", group: "Paiements" },
  { key: "Chapitre", label: "Chapitre", group: "Paiements" },
  { key: "District", label: "District", group: "Paiements" },
  { key: "Groupe", label: "Groupe", group: "Paiements" },
  { key: "Période", label: "Période", group: "Paiements" },
  { key: "Motif", label: "Motif", group: "Paiements" },
];

export const ZAIMU_EXPORT_FIELDS: ExportFieldOption[] = [
  ...ZAIMU_BILAN_EXPORT_FIELDS,
  ...ZAIMU_PAYMENT_EXPORT_FIELDS,
];

export const ZAIMU_EXPORT_DEFAULT_FIELDS = [
  "Membre",
  "Chapitre",
  "District",
  "Groupe",
  "Cota assignée (FCFA)",
  "Payé validé (FCFA)",
  "Reste (FCFA)",
  "Statut cota",
  "Référence",
  "Référence reçu",
  "Date",
  "Montant (FCFA)",
  "Statut",
  "Motif",
];

function pickRowFields(row: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of fields) out[key] = row[key] ?? "";
  return out;
}

/** Prénom / Nom (ou Membre) restent toujours en tête des colonnes exportées. */
export function ensureLeadingNameFields(fields: string[], leading: string[]) {
  const rest = fields.filter((f) => !leading.includes(f));
  return [...leading, ...rest];
}

/** Garantit la présence et l’ordre : Membre → … → Payé → Montant restant. */
export function ensureZaimuBilanColumns(fields: string[]) {
  const withMember = ensureLeadingNameFields(fields, ["Membre"]);
  const withoutReste = withMember.filter((f) => f !== "Reste (FCFA)");
  const payeIdx = withoutReste.indexOf("Payé validé (FCFA)");
  if (payeIdx >= 0) {
    return [
      ...withoutReste.slice(0, payeIdx + 1),
      "Reste (FCFA)",
      ...withoutReste.slice(payeIdx + 1),
    ];
  }
  const cotaIdx = withoutReste.indexOf("Cota assignée (FCFA)");
  if (cotaIdx >= 0) {
    return [
      ...withoutReste.slice(0, cotaIdx + 1),
      "Reste (FCFA)",
      ...withoutReste.slice(cotaIdx + 1),
    ];
  }
  return [...withoutReste.slice(0, 1), "Reste (FCFA)", ...withoutReste.slice(1)];
}

/** Séparateur de milliers ASCII — jsPDF ne gère pas bien \u202f / \u00a0 (affichés comme "/"). */
export function formatExportNumber(n: number) {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return `${sign}${String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

function sanitizeExportText(value: string) {
  return value.replace(/[\u00a0\u202f\u2007\u2009]/g, " ");
}

function formatCell(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return formatExportNumber(value);
  return sanitizeExportText(String(value ?? ""));
}

function isAmountField(key: string) {
  return /fcfa|cdf|montant|cota|payé|paye|reste|assigne|assigné|dons|zaimu/i.test(key);
}

function drawTableHeaderRow(
  doc: jsPDF,
  fields: string[],
  labels: Record<string, string>,
  widths: number[],
  margin: number,
  usable: number,
  y: number,
  headerColor: [number, number, number],
) {
  const rowH = 18;
  doc.setFillColor(...headerColor);
  doc.rect(margin, y - 11, usable, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  let x = margin;
  fields.forEach((key, i) => {
    const label = sanitizeExportText(labels[key] || key);
    const lines = doc.splitTextToSize(label, Math.max(14, widths[i] - 4));
    const first = Array.isArray(lines) ? lines.slice(0, 2) : [String(lines || "")];
    doc.text(first, x + 2, y - 2);
    x += widths[i];
  });
  return y + rowH - 2;
}

function drawDynamicPdfTable(
  doc: jsPDF,
  rows: Record<string, unknown>[],
  fields: string[],
  labels: Record<string, string>,
  startY: number,
  headerColor: [number, number, number],
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;
  const usable = pageW - margin * 2;
  const bottomLimit = pageH - 44;
  const weights = fields.map((key) => {
    if (/zaimusp|zaimu sp/i.test(key) || /payé\/cota|paye\/cota/i.test(labels[key] || "")) return 1.55;
    if (/zaimuord|zaimu ord/i.test(key)) return 1.2;
    if (isAmountField(key)) return 1.2;
    if (/email/i.test(key)) return 1.35;
    if (/telephone|téléphone/i.test(key)) return 1.05;
    if (/responsabilite|responsabilité/i.test(key)) return 1.15;
    if (/prenom|prénom|nom$/i.test(key)) return 1.05;
    if (/vague|gohonzon|sokahan|statut/i.test(key)) return 0.85;
    return 0.95;
  });
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const widths = weights.map((w) => (usable * w) / weightSum);
  let y = startY;

  y = drawTableHeaderRow(doc, fields, labels, widths, margin, usable, y, headerColor);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(16, 32, 51);

  rows.forEach((row, index) => {
    const lineSets = fields.map((key, i) => {
      const text = formatCell(row[key]);
      const maxWidth = Math.max(12, widths[i] - 4);
      const lines = doc.splitTextToSize(text, maxWidth);
      const arr = Array.isArray(lines) ? lines.map(String) : [String(lines || "")];
      return arr.slice(0, 2);
    });
    const maxLines = Math.max(1, ...lineSets.map((lines) => lines.length));
    const rowH = 9 + maxLines * 8;

    if (y + rowH > bottomLimit) {
      doc.addPage();
      y = 36;
      y = drawTableHeaderRow(doc, fields, labels, widths, margin, usable, y, headerColor);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(16, 32, 51);
    }
    if (index % 2 === 0) {
      doc.setFillColor(246, 248, 251);
      doc.rect(margin, y - 9, usable, rowH, "F");
    }
    let x = margin;
    doc.setFontSize(6);
    fields.forEach((_key, i) => {
      doc.text(lineSets[i], x + 2, y);
      x += widths[i];
    });
    y += rowH;
  });

  return y;
}

function drawMembersPdfChrome(doc: jsPDF, subtitle: string, scopeLine: string, meta: string) {
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
  doc.text("Centre Miroir Parfait — SGI Côte d'Ivoire", 28, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(sanitizeExportText(subtitle), 28, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 230, 170);
  const scopeText = scopeLine.trim()
    ? (scopeLine.toLowerCase().startsWith("périmètre") || scopeLine.toLowerCase().startsWith("perimetre")
        ? scopeLine
        : `Périmètre : ${scopeLine}`)
    : "Périmètre : non précisé";
  doc.text(sanitizeExportText(scopeText), 28, 54);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(220, 230, 240);
  doc.text(sanitizeExportText(meta), 28, 66);
}

function drawMembersPdfFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(220, 226, 234);
    doc.setLineWidth(0.7);
    doc.line(32, pageH - 30, pageW - 32, pageH - 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Document généré pour usage interne — Centre Miroir Parfait", 32, pageH - 16);
    doc.text(`Page ${i} / ${pageCount}`, pageW - 32, pageH - 16, { align: "right" });
  }
}

type MemberPdfSummaryCard = {
  label: string;
  value: string;
  hint?: string;
  accent: [number, number, number];
};

function isMembreSimple(responsabilite: string) {
  const value = (responsabilite || "").trim();
  return !value || value === "Membre" || value === "Membre simple";
}

/** Libellé de périmètre à partir des membres exportés. */
export function inferExportOrgScope(members: MemberRecord[]): string {
  const unique = (values: string[]) =>
    [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  const chapitres = unique(members.map((m) => m.chapitre));
  const districts = unique(members.map((m) => m.district));
  const groupes = unique(members.map((m) => m.groupe));

  const parts: string[] = [];
  if (chapitres.length === 1) parts.push(`Chapitre ${chapitres[0]}`);
  else if (chapitres.length > 1) parts.push(`${chapitres.length} chapitres`);
  if (districts.length === 1) parts.push(`District ${districts[0]}`);
  else if (districts.length > 1) parts.push(`${districts.length} districts`);
  if (groupes.length === 1) parts.push(`Groupe ${groupes[0]}`);
  else if (groupes.length > 1) parts.push(`${groupes.length} groupes`);

  return parts.length > 0 ? parts.join(" · ") : "Périmètre non précisé";
}

export function formatExportOrgScope(input?: {
  chapitre?: string;
  district?: string;
  groupe?: string;
  label?: string;
} | null): string {
  if (!input) return "";
  const parts: string[] = [];
  if (input.chapitre?.trim()) parts.push(`Chapitre ${input.chapitre.trim()}`);
  if (input.district?.trim()) parts.push(`District ${input.district.trim()}`);
  if (input.groupe?.trim()) parts.push(`Groupe ${input.groupe.trim()}`);
  if (parts.length) return parts.join(" · ");
  return input.label?.trim() || "";
}

export function computeMemberZaimuTotals(
  members: MemberRecord[],
  finance: {
    collectes?: CollectePayment[];
    zsAssigneById?: Record<string, number>;
    /** Cota du périmètre (groupe/district/chapitre/centre), prioritaire sur la somme membres. */
    zsPerimeterCota?: number | null;
  } = {},
) {
  const collectes = finance.collectes || [];
  let zaimuOrdinaire = 0;
  let zaimuSpecialPaye = 0;
  let memberCotaSum = 0;
  for (const member of members) {
    zaimuOrdinaire += getMemberZaimuPaid(collectes, member, "zaimu-ordinaire");
    zaimuSpecialPaye += getMemberZaimuPaid(collectes, member, "zaimu-special");
    if (member.remoteId) {
      memberCotaSum += Number(finance.zsAssigneById?.[member.remoteId] || 0);
    }
  }
  const perimeter = Number(finance.zsPerimeterCota);
  const zaimuSpecialCota =
    Number.isFinite(perimeter) && perimeter > 0 ? perimeter : memberCotaSum;
  return {
    zaimuOrdinaire,
    zaimuSpecialPaye,
    zaimuSpecialCota,
    zaimuSpecialReste: Math.max(0, zaimuSpecialCota - zaimuSpecialPaye),
  };
}

/** Indicateurs consolidés selon les champs cochés à l’export. */
export function buildMemberPdfSummaryCards(
  members: MemberRecord[],
  selectedFields: string[],
  finance: MemberExportFinanceOptions = {},
): { cards: MemberPdfSummaryCard[]; detailLines: string[] } {
  const selected = new Set(selectedFields);
  const total = members.length;
  const cards: MemberPdfSummaryCard[] = [
    {
      label: "Effectif",
      value: formatExportNumber(total),
      hint: "membres",
      accent: [10, 47, 82],
    },
  ];
  const detailLines: string[] = [];

  if (selected.has("Statut")) {
    const actifs = members.filter((m) => m.statut === "Actif").length;
    const pending = members.filter((m) => m.statut === "En attente").length;
    const suspendus = members.filter((m) => m.statut === "Suspendu").length;
    cards.push({
      label: "Actifs",
      value: formatExportNumber(actifs),
      hint: total ? `${Math.round((actifs / total) * 100)} %` : undefined,
      accent: [31, 122, 69],
    });
    if (pending > 0) {
      cards.push({ label: "En attente", value: formatExportNumber(pending), accent: [200, 151, 26] });
    }
    if (suspendus > 0) {
      cards.push({ label: "Suspendus", value: formatExportNumber(suspendus), accent: [194, 58, 43] });
    }
  }

  if (selected.has("VagueDePaix")) {
    const abonnes = members.filter((m) => m.abonnementVaguePaix).length;
    cards.push({
      label: "Abonnés VP",
      value: formatExportNumber(abonnes),
      hint: total ? `${Math.round((abonnes / total) * 100)} %` : undefined,
      accent: [26, 52, 112],
    });
  }

  const showZaimuSp = selected.has("ZaimuSp");
  const showZaimuOrd = selected.has("ZaimuOrd");
  if (showZaimuSp || showZaimuOrd) {
    const totals = computeMemberZaimuTotals(members, finance);
    if (showZaimuSp) {
      cards.push({
        label: "Zaimu sp. payé",
        value: formatExportNumber(totals.zaimuSpecialPaye),
        hint: "FCFA",
        accent: [194, 58, 43],
      });
      cards.push({
        label: "Zaimu sp. reste",
        value: formatExportNumber(totals.zaimuSpecialReste),
        hint: `cota périmètre ${formatExportNumber(totals.zaimuSpecialCota)}`,
        accent: [200, 151, 26],
      });
    }
    if (showZaimuOrd) {
      cards.push({
        label: "Zaimu ordinaire",
        value: formatExportNumber(totals.zaimuOrdinaire),
        hint: "FCFA validés",
        accent: [26, 52, 112],
      });
    }
    const financeParts: string[] = [];
    if (showZaimuSp) {
      financeParts.push(
        `Zaimu spécial : payé ${formatExportNumber(totals.zaimuSpecialPaye)} · reste ${formatExportNumber(totals.zaimuSpecialReste)} (cota périmètre ${formatExportNumber(totals.zaimuSpecialCota)})`,
      );
    }
    if (showZaimuOrd) {
      financeParts.push(
        `Zaimu ordinaire : ${formatExportNumber(totals.zaimuOrdinaire)} FCFA validés`,
      );
    }
    if (financeParts.length) {
      detailLines.push(`Point consolidé — ${financeParts.join(" · ")}`);
    }
  }

  if (selected.has("Gohonzon")) {
    const gohonzon = members.filter((m) => m.gohonzon).length;
    cards.push({
      label: "Gohonzon",
      value: formatExportNumber(gohonzon),
      hint: total ? `${Math.round((gohonzon / total) * 100)} %` : undefined,
      accent: [194, 58, 43],
    });
  }

  if (selected.has("Sokahan")) {
    const sokahan = members.filter((m) => m.sokahan).length;
    cards.push({
      label: "Sokahan",
      value: formatExportNumber(sokahan),
      hint: total ? `${Math.round((sokahan / total) * 100)} %` : undefined,
      accent: [200, 151, 26],
    });
  }

  if (selected.has("Abonnement")) {
    const abonnes = members.filter((m) => m.abonnement).length;
    cards.push({
      label: "Abonnés service",
      value: formatExportNumber(abonnes),
      accent: [200, 151, 26],
    });
  }

  if (selected.has("Responsabilite")) {
    const simples = members.filter((m) => isMembreSimple(m.responsabilite)).length;
    const responsables = total - simples;
    cards.push({
      label: "Membres simples",
      value: formatExportNumber(simples),
      accent: [10, 47, 82],
    });
    cards.push({
      label: "Responsables",
      value: formatExportNumber(responsables),
      accent: [200, 151, 26],
    });

    const byRole = new Map<string, number>();
    for (const member of members) {
      if (isMembreSimple(member.responsabilite)) continue;
      const key = (member.responsabilite || "Responsable").trim();
      byRole.set(key, (byRole.get(key) || 0) + 1);
    }
    if (byRole.size > 0) {
      detailLines.push(
        `Répartition responsables : ${[...byRole.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
          .map(([label, count]) => `${label} (${formatExportNumber(count)})`)
          .join(" · ")}`,
      );
    }
  }

  if (selected.has("Categorie") || selected.has("Departement")) {
    const accents: Record<(typeof MEMBER_DEPARTEMENT_VALUES)[number], [number, number, number]> = {
      Homme: [10, 47, 82],
      Femme: [200, 151, 26],
      "Jeune homme": [26, 52, 112],
      "Jeune fille": [194, 58, 43],
      Avenir: [31, 122, 69],
    };
    for (const label of MEMBER_DEPARTEMENT_VALUES) {
      const value = members.filter(
        (m) => memberDepartementLabel(m).toLowerCase() === label.toLowerCase(),
      ).length;
      cards.push({
        label,
        value: formatExportNumber(value),
        accent: accents[label],
      });
    }
  }

  if (selected.has("Chapitre") || selected.has("District") || selected.has("Groupe")) {
    const distinct = (getter: (m: MemberRecord) => string) =>
      new Set(members.map(getter).map((v) => v.trim()).filter(Boolean)).size;
    const parts: string[] = [];
    if (selected.has("Chapitre")) parts.push(`${formatExportNumber(distinct((m) => m.chapitre))} chapitre(s)`);
    if (selected.has("District")) parts.push(`${formatExportNumber(distinct((m) => m.district))} district(s)`);
    if (selected.has("Groupe")) parts.push(`${formatExportNumber(distinct((m) => m.groupe))} groupe(s)`);
    if (parts.length) detailLines.push(`Couverture organisationnelle : ${parts.join(" · ")}`);
  }

  return { cards, detailLines };
}

function drawMemberPdfSummary(
  doc: jsPDF,
  cards: MemberPdfSummaryCard[],
  detailLines: string[],
  startY: number,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 32;
  const usable = pageW - margin * 2;
  let y = startY;

  doc.setTextColor(10, 47, 82);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Statistiques consolidees", margin, y);
  doc.setDrawColor(200, 151, 26);
  doc.setLineWidth(2);
  doc.line(margin, y + 5, margin + 178, y + 5);
  y += 16;

  const perRow = Math.min(6, Math.max(1, cards.length));
  const gap = 8;
  const cardH = 46;
  const cardW = (usable - gap * (perRow - 1)) / perRow;

  cards.forEach((card, index) => {
    const col = index % perRow;
    const row = Math.floor(index / perRow);
    const x = margin + col * (cardW + gap);
    const cy = y + row * (cardH + gap);

    doc.setFillColor(246, 248, 251);
    doc.roundedRect(x, cy, cardW, cardH, 5, 5, "F");
    doc.setFillColor(...card.accent);
    doc.rect(x, cy, 3.5, cardH, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(sanitizeExportText(card.label), x + 10, cy + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(16, 32, 51);
    doc.text(card.value, x + 10, cy + 34);

    if (card.hint) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(sanitizeExportText(card.hint), x + cardW - 8, cy + 34, { align: "right" });
    }
  });

  y += Math.ceil(cards.length / perRow) * (cardH + gap) + 2;

  for (const line of detailLines) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const wrapped = doc.splitTextToSize(sanitizeExportText(line), usable);
    doc.text(wrapped, margin, y);
    y += (Array.isArray(wrapped) ? wrapped.length : 1) * 11 + 2;
  }

  return y + 6;
}

const EXAMPLE_ROW: Record<MemberImportColumn, string> = {
  Prenom: "Awa",
  Nom: "Traoré",
  Email: "awa.traore@email.com",
  Telephone: "+225 07 00 00 00 00",
  DateNaissance: "1995-04-12",
  Departement: "Femme",
  Categorie: "Femme",
  Responsabilite: "Membre simple",
  DateDebutPratique: "2019-01-15",
  VagueDePaix: "Oui",
  Gohonzon: "Non",
  Sokahan: "Non",
  Quartier: "Cocody",
  Chapitre: "Rissho Ankoku Ron",
  District: "District Bodhisattva",
  Groupe: "BODDHISATTVA",
  Statut: "Actif",
  Abonnement: "Oui",
  DateAdhesion: "2026-01-10",
};

const GUIDE_ROWS = [
  {
    Champ: "Identifiant",
    Regle: "Prénom + Nom, ou Email. Tous les autres champs sont optionnels.",
  },
  {
    Champ: "Mise à jour",
    Regle: "Si le membre existe déjà (même email ou même nom), seules les colonnes remplies sont modifiées — idéal pour changer Chapitre / District / Groupe.",
  },
  { Champ: "Departement / Categorie", Regle: "Optionnel. Homme | Femme | Jeune homme | Jeune fille | Avenir" },
  {
    Champ: "Responsabilite",
    Regle: "Optionnel. Membre simple | Responsable groupe | Responsable district | Responsable chapitre | Responsable centre",
  },
  { Champ: "VagueDePaix / Gohonzon / Sokahan / Abonnement", Regle: "Optionnel. Oui ou Non (cellule vide = inchangé)" },
  { Champ: "Statut", Regle: "Optionnel. Actif | En attente | Suspendu" },
  { Champ: "Dates", Regle: "Optionnel. Format AAAA-MM-JJ (ex. 2026-08-01)" },
  {
    Champ: "Chapitre / District / Groupe",
    Regle: "Optionnels. Si vides, le membre est enregistré avec son nom seulement (non affecté). S’ils sont remplis, utiliser les libellés de l’application.",
  },
];

function yesNo(value: boolean) {
  return value ? "Oui" : "Non";
}

function parseYesNo(value: unknown): boolean | undefined {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return undefined;
  if (["oui", "yes", "true", "1", "o", "y"].includes(raw)) return true;
  if (["non", "no", "false", "0", "n"].includes(raw)) return false;
  return undefined;
}

function normalizePersonKey(prenom: string, nom: string) {
  return `${prenom} ${nom}`.trim().toLowerCase().replace(/\s+/g, " ");
}

function foldHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const FOLDED_IMPORT_HEADERS: Record<string, MemberImportColumn> = {
  prenom: "Prenom",
  nom: "Nom",
  email: "Email",
  mail: "Email",
  courriel: "Email",
  telephone: "Telephone",
  tel: "Telephone",
  portable: "Telephone",
  datenaissance: "DateNaissance",
  naissance: "DateNaissance",
  departement: "Departement",
  categorie: "Categorie",
  responsabilite: "Responsabilite",
  datedebutpratique: "DateDebutPratique",
  debutpratique: "DateDebutPratique",
  vaguedepaix: "VagueDePaix",
  vp: "VagueDePaix",
  gohonzon: "Gohonzon",
  sokahan: "Sokahan",
  quartier: "Quartier",
  chapitre: "Chapitre",
  district: "District",
  groupe: "Groupe",
  statut: "Statut",
  abonnement: "Abonnement",
  dateadhesion: "DateAdhesion",
  adhesion: "DateAdhesion",
};

function remapImportRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const [key, value] of Object.entries(row)) {
    const mapped = FOLDED_IMPORT_HEADERS[foldHeader(key)];
    if (!mapped) continue;
    const current = out[mapped];
    if (current === undefined || current === null || String(current).trim() === "") {
      out[mapped] = value;
    }
  }
  return out;
}

function cell(row: Record<string, unknown>, key: string) {
  const remapped = remapImportRow(row);
  const exact = remapped[key];
  if (exact !== undefined && exact !== null && String(exact).trim() !== "") {
    if (typeof exact === "number" && Number.isFinite(exact)) {
      const parsed = XLSX.SSF.parse_date_code(exact);
      if (parsed && exact > 20000) {
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
      return String(exact).trim();
    }
    return String(exact).trim();
  }
  return "";
}

export function memberToImportRow(member: MemberRecord): Record<MemberImportColumn, string> {
  return {
    Prenom: member.prenom,
    Nom: member.nom,
    Email: member.email,
    Telephone: member.telephone,
    DateNaissance: member.dateNaissance,
    Departement: memberDepartementLabel(member),
    Categorie: memberDepartementLabel(member) || member.categorie,
    Responsabilite: member.responsabilite === "Membre" ? "Membre simple" : member.responsabilite,
    DateDebutPratique: member.dateDebutPratique,
    VagueDePaix: yesNo(member.abonnementVaguePaix),
    Gohonzon: yesNo(member.gohonzon),
    Sokahan: yesNo(member.sokahan),
    Quartier: member.quartier,
    Chapitre: member.chapitre,
    District: member.district,
    Groupe: member.groupe,
    Statut: member.statut,
    Abonnement: yesNo(member.abonnement),
    DateAdhesion: member.adhesion,
  };
}

export type MemberExportFinanceOptions = {
  collectes?: CollectePayment[];
  zsAssigneById?: Record<string, number>;
  /** Cota assignée au périmètre du rôle (prioritaire pour le point consolidé). */
  zsPerimeterCota?: number | null;
};

/** Ligne d’export membres (inclut Zaimu ord. / Zaimu sp.). */
export function memberToExportRow(
  member: MemberRecord,
  options: MemberExportFinanceOptions = {},
): Record<string, string | number> {
  const base = memberToImportRow(member);
  const collectes = options.collectes || [];
  const zoPaye = getMemberZaimuPaid(collectes, member, "zaimu-ordinaire");
  const zsPaye = getMemberZaimuPaid(collectes, member, "zaimu-special");
  const zsAssigne = member.remoteId
    ? Number(options.zsAssigneById?.[member.remoteId] || 0)
    : 0;
  return {
    ...base,
    ZaimuOrd: formatExportNumber(zoPaye),
    ZaimuSp: `${formatExportNumber(zsPaye)} / ${formatExportNumber(zsAssigne)}`,
  };
}

export function downloadMemberImportTemplate(filename = "template_import_membres_sgi.xlsx") {
  const workbook = XLSX.utils.book_new();
  const templateSheet = XLSX.utils.json_to_sheet([EXAMPLE_ROW], {
    header: [...MEMBER_IMPORT_COLUMNS],
  });
  const guideSheet = XLSX.utils.json_to_sheet(GUIDE_ROWS);
  XLSX.utils.book_append_sheet(workbook, templateSheet, "Membres");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Instructions");
  XLSX.writeFile(workbook, filename);
}

function sanitizeRowForExcel(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = Math.round(value);
    } else {
      out[key] = sanitizeExportText(String(value ?? ""));
    }
  }
  return out;
}

export function exportMembersExcel(
  members: MemberRecord[],
  filename: string,
  fields: string[] = MEMBER_EXPORT_DEFAULT_FIELDS,
  finance: MemberExportFinanceOptions = {},
  scope?: { chapitre?: string; district?: string; groupe?: string; label?: string } | null,
) {
  const selected = ensureLeadingNameFields(
    fields.length ? fields : MEMBER_EXPORT_DEFAULT_FIELDS,
    ["Prenom", "Nom"]
  );
  const selectedSet = new Set(selected);
  const rows = members.map((m) =>
    sanitizeRowForExcel(pickRowFields(memberToExportRow(m, finance), selected)),
  );
  const scopeLabel =
    inferExportOrgScope(members) !== "Périmètre non précisé"
      ? inferExportOrgScope(members)
      : formatExportOrgScope(scope) || "Périmètre non précisé";
  const totals = computeMemberZaimuTotals(members, finance);
  const summaryRows: { Indicateur: string; Valeur: string | number }[] = [
    { Indicateur: "Périmètre", Valeur: scopeLabel },
    { Indicateur: "Effectif", Valeur: members.length },
  ];
  if (selectedSet.has("Departement") || selectedSet.has("Categorie")) {
    for (const label of MEMBER_DEPARTEMENT_VALUES) {
      summaryRows.push({
        Indicateur: label,
        Valeur: members.filter(
          (m) => memberDepartementLabel(m).toLowerCase() === label.toLowerCase(),
        ).length,
      });
    }
  }
  if (selectedSet.has("ZaimuSp")) {
    summaryRows.push(
      { Indicateur: "Zaimu sp. payé (FCFA)", Valeur: Math.round(totals.zaimuSpecialPaye) },
      { Indicateur: "Zaimu sp. reste (FCFA)", Valeur: Math.round(totals.zaimuSpecialReste) },
      { Indicateur: "Zaimu sp. cota périmètre (FCFA)", Valeur: Math.round(totals.zaimuSpecialCota) },
    );
  }
  if (selectedSet.has("ZaimuOrd")) {
    summaryRows.push({
      Indicateur: "Zaimu ordinaire validé (FCFA)",
      Valeur: Math.round(totals.zaimuOrdinaire),
    });
  }
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Synthese");
  const sheet = XLSX.utils.json_to_sheet(
    rows.length ? rows : [Object.fromEntries(selected.map((c) => [c, ""]))],
    { header: selected }
  );
  XLSX.utils.book_append_sheet(workbook, sheet, "Membres");
  XLSX.writeFile(workbook, filename);
}

export function exportMembersPdf(
  members: MemberRecord[],
  options: {
    title?: string;
    filename: string;
    fields?: string[];
    finance?: MemberExportFinanceOptions;
    scope?: { chapitre?: string; district?: string; groupe?: string; label?: string } | null;
  },
) {
  const selected = ensureLeadingNameFields(
    options.fields?.length ? options.fields : MEMBER_EXPORT_DEFAULT_FIELDS,
    ["Prenom", "Nom"]
  );
  const labels = Object.fromEntries(MEMBER_EXPORT_FIELDS.map((f) => [f.key, f.label]));
  const finance = options.finance || {};
  const rows = members.map((m) => pickRowFields(memberToExportRow(m, finance), selected));
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const generatedAt = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const inferred = inferExportOrgScope(members);
  const scopeLabel =
    inferred !== "Périmètre non précisé"
      ? inferred
      : formatExportOrgScope(options.scope) || inferred;

  drawMembersPdfChrome(
    doc,
    options.title || "Liste des membres",
    scopeLabel,
    `${members.length} membre${members.length > 1 ? "s" : ""} · Généré le ${generatedAt}`,
  );

  const { cards, detailLines } = buildMemberPdfSummaryCards(members, selected, finance);

  let y = 96;
  y = drawMemberPdfSummary(doc, cards, detailLines, y);

  doc.setTextColor(10, 47, 82);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Liste detaillee", 28, y);
  doc.setDrawColor(200, 151, 26);
  doc.setLineWidth(2);
  doc.line(28, y + 5, 112, y + 5);
  y += 18;

  drawDynamicPdfTable(doc, rows, selected, labels, y, [10, 47, 82]);
  drawMembersPdfFooters(doc);
  doc.save(options.filename);
}

function buildZaimuSpecialMemberRows(members: MemberRecord[], collectes: ZaimuSpecialPaymentRow[]) {
  return members.map((m) => {
    const name = memberFullName(m);
    const assigne = getMemberSpecialAssignment(ZAIMU_SPECIAL_CAMPAIGN, m);
    const paye = getMemberZaimuPaid(collectes, m, "zaimu-special");
    const reste = Math.max(0, assigne - paye);
    const paiements = collectes.filter(
      (c) =>
        c.type === "zaimu-special" &&
        c.membre.trim().toLowerCase() === name.trim().toLowerCase()
    );
    const payeValide = paiements
      .filter((c) => c.statut === "Validé")
      .reduce((sum, c) => sum + c.montant, 0);
    const dernier = [...paiements].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];

    return {
      Membre: name,
      Email: m.email,
      Chapitre: m.chapitre,
      District: m.district,
      Groupe: m.groupe,
      "Cota assignée (FCFA)": assigne,
      "Payé validé (FCFA)": payeValide || paye,
      "Reste (FCFA)": reste,
      "Nb paiements": paiements.length,
      "Dernier paiement": dernier?.date || "—",
      "Statut cota": assigne <= 0 ? "Sans cota" : reste === 0 ? "Soldé" : paye > 0 ? "En cours" : "Non commencé",
    };
  });
}

function buildZaimuSpecialPaymentRows(members: MemberRecord[], collectes: ZaimuSpecialPaymentRow[]) {
  const names = new Set(members.map((m) => memberFullName(m).trim().toLowerCase()));
  return collectes
    .filter((c) => c.type === "zaimu-special" && names.has(c.membre.trim().toLowerCase()))
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    .map((c) => ({
      Référence: c.id || "—",
      "Référence reçu": c.referenceRecu || "—",
      Date: c.date || "—",
      Membre: c.membre,
      "Montant (FCFA)": c.montant,
      Statut: c.statut,
      Chapitre: c.chapitre,
      District: c.district,
      Groupe: c.groupe,
      Période: c.periode || "—",
      Motif: c.motif || "—",
    }));
}

export function exportZaimuSpecialExcel(
  members: MemberRecord[],
  collectes: ZaimuSpecialPaymentRow[],
  filename: string,
  fields: string[] = ZAIMU_EXPORT_DEFAULT_FIELDS
) {
  const selected = fields.length ? fields : ZAIMU_EXPORT_DEFAULT_FIELDS;
  const bilanFields = ensureZaimuBilanColumns(
    selected.filter((f) => ZAIMU_BILAN_EXPORT_FIELDS.some((o) => o.key === f))
  );
  const paymentFields = ensureLeadingNameFields(
    selected.filter((f) => ZAIMU_PAYMENT_EXPORT_FIELDS.some((o) => o.key === f)),
    ["Membre"]
  );
  const bilan = buildZaimuSpecialMemberRows(members, collectes).map((r) =>
    sanitizeRowForExcel(pickRowFields(r, bilanFields))
  );
  const paiements = buildZaimuSpecialPaymentRows(members, collectes).map((r) =>
    sanitizeRowForExcel(pickRowFields(r, paymentFields))
  );
  const workbook = XLSX.utils.book_new();
  if (bilanFields.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(bilan.length ? bilan : [Object.fromEntries(bilanFields.map((c) => [c, ""]))], {
        header: bilanFields,
      }),
      "Bilan cota membres"
    );
  }
  if (paymentFields.length) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        paiements.length ? paiements : [Object.fromEntries(paymentFields.map((c) => [c, ""]))],
        { header: paymentFields }
      ),
      "Paiements détail"
    );
  }
  if (!workbook.SheetNames.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Info: "Aucun champ sélectionné" }]), "Vide");
  }
  XLSX.writeFile(workbook, filename);
}

export function exportZaimuSpecialPdf(
  members: MemberRecord[],
  collectes: ZaimuSpecialPaymentRow[],
  options: { title?: string; filename: string; fields?: string[] }
) {
  const selected = options.fields?.length ? options.fields : ZAIMU_EXPORT_DEFAULT_FIELDS;
  const bilanFields = ensureZaimuBilanColumns(
    selected.filter((f) => ZAIMU_BILAN_EXPORT_FIELDS.some((o) => o.key === f))
  );
  const paymentFields = ensureLeadingNameFields(
    selected.filter((f) => ZAIMU_PAYMENT_EXPORT_FIELDS.some((o) => o.key === f)),
    ["Membre"]
  );
  const labels = Object.fromEntries(ZAIMU_EXPORT_FIELDS.map((f) => [f.key, f.label]));
  const bilan = buildZaimuSpecialMemberRows(members, collectes);
  const paiements = buildZaimuSpecialPaymentRows(members, collectes);
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const margin = 32;
  const totalPaye = bilan.reduce((s, r) => s + Number(r["Payé validé (FCFA)"] || 0), 0);
  const totalAssigne = bilan.reduce((s, r) => s + Number(r["Cota assignée (FCFA)"] || 0), 0);
  const generatedAt = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const scopeLabel = inferExportOrgScope(members);
  drawMembersPdfChrome(
    doc,
    options.title || "Paiements Zaimu spécial",
    scopeLabel,
    `${bilan.length} membre${bilan.length > 1 ? "s" : ""} · ${paiements.length} paiement${paiements.length > 1 ? "s" : ""} · Cota ${formatExportNumber(totalAssigne)} · Payé ${formatExportNumber(totalPaye)} FCFA · ${generatedAt}`,
  );
  let y = 96;

  if (bilanFields.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 47, 82);
    doc.text("Bilan cota par membre", margin, y);
    doc.setDrawColor(200, 151, 26);
    doc.setLineWidth(2);
    doc.line(margin, y + 5, 180, y + 5);
    y += 22;
    y = drawDynamicPdfTable(
      doc,
      bilan.map((r) => pickRowFields(r, bilanFields)),
      bilanFields,
      labels,
      y,
      [10, 47, 82]
    );
    y += 20;
  }

  if (paymentFields.length) {
    if (y > 480) {
      doc.addPage();
      y = 40;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 47, 82);
    doc.text("Détail des paiements", margin, y);
    doc.setDrawColor(194, 58, 43);
    doc.setLineWidth(2);
    doc.line(margin, y + 5, 168, y + 5);
    y += 22;
    drawDynamicPdfTable(
      doc,
      paiements.map((r) => pickRowFields(r, paymentFields)),
      paymentFields,
      labels,
      y,
      [194, 58, 43]
    );
  }

  drawMembersPdfFooters(doc);
  doc.save(options.filename);
}

export type ParsedImportMember = {
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  dateNaissance?: string;
  departement?: string;
  categorie?: string;
  responsabilite?: string;
  dateDebutPratique?: string;
  abonnementVaguePaix?: boolean;
  gohonzon?: boolean;
  sokahan?: boolean;
  quartier?: string;
  chapitre?: string;
  district?: string;
  groupe?: string;
  statut?: string;
  abonnement?: boolean;
  adhesion?: string;
};

export type ImportParseResult = {
  members: ParsedImportMember[];
  errors: string[];
};

export function parseMembersImportWorkbook(data: ArrayBuffer | string): ImportParseResult {
  const workbook = XLSX.read(data, { type: typeof data === "string" ? "string" : "array" });
  const preferred = ["Membres", "Liste", "Members", "Adherents"];
  const sheetName =
    preferred.find((name) => workbook.SheetNames.includes(name)) ||
    workbook.SheetNames.find((name) => foldHeader(name) !== "instructions") ||
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const members: ParsedImportMember[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const prenom = cell(row, "Prenom");
    const nom = cell(row, "Nom");
    const emailRaw = cell(row, "Email");
    const email = emailRaw.toLowerCase();

    if (!prenom && !nom && !email) return;

    if ((!prenom || !nom) && !email) {
      errors.push(`Ligne ${line} : indiquez Prénom et Nom, ou un Email, pour identifier le membre.`);
      return;
    }
    if (email && !email.includes("@")) {
      errors.push(`Ligne ${line} : Email invalide (${email}).`);
      return;
    }

    members.push({
      prenom,
      nom,
      email,
      telephone: cell(row, "Telephone") || undefined,
      dateNaissance: cell(row, "DateNaissance") || undefined,
      departement: cell(row, "Departement") || undefined,
      categorie: cell(row, "Categorie") || undefined,
      responsabilite: cell(row, "Responsabilite") || undefined,
      dateDebutPratique: cell(row, "DateDebutPratique") || undefined,
      abonnementVaguePaix: parseYesNo(cell(row, "VagueDePaix")),
      gohonzon: parseYesNo(cell(row, "Gohonzon")),
      sokahan: parseYesNo(cell(row, "Sokahan")),
      quartier: cell(row, "Quartier") || undefined,
      chapitre: cell(row, "Chapitre") || undefined,
      district: cell(row, "District") || undefined,
      groupe: cell(row, "Groupe") || undefined,
      statut: cell(row, "Statut") || undefined,
      abonnement: parseYesNo(cell(row, "Abonnement")),
      adhesion: cell(row, "DateAdhesion") || undefined,
    });
  });

  return { members, errors };
}

function findExistingMember(existing: MemberRecord[], row: ParsedImportMember) {
  if (row.email) {
    const byEmail = existing.find(
      (item) => (item.email || "").trim().toLowerCase() === row.email,
    );
    if (byEmail) return byEmail;
  }
  if (row.prenom && row.nom) {
    const key = normalizePersonKey(row.prenom, row.nom);
    return existing.find(
      (item) => normalizePersonKey(item.prenom || "", item.nom || "") === key,
    );
  }
  return undefined;
}

function mergeImportedMember(base: MemberRecord, row: ParsedImportMember): MemberRecord {
  const departement = row.departement || row.categorie || base.departement;
  const categorie = row.categorie || row.departement || base.categorie;
  const orgChanged = Boolean(row.chapitre || row.district || row.groupe);
  return {
    ...base,
    prenom: row.prenom.trim() || base.prenom,
    nom: row.nom.trim() || base.nom,
    email: row.email.trim().toLowerCase() || base.email,
    telephone: row.telephone !== undefined ? row.telephone.trim() : base.telephone,
    dateNaissance: row.dateNaissance ?? base.dateNaissance,
    departement,
    categorie,
    responsabilite: row.responsabilite || base.responsabilite,
    dateDebutPratique: row.dateDebutPratique ?? base.dateDebutPratique,
    abonnementVaguePaix: row.abonnementVaguePaix ?? base.abonnementVaguePaix,
    gohonzon: row.gohonzon ?? base.gohonzon,
    sokahan: row.sokahan ?? base.sokahan,
    quartier: row.quartier !== undefined ? row.quartier : base.quartier,
    chapitre: row.chapitre || base.chapitre,
    district: row.district || base.district,
    groupe: row.groupe || base.groupe,
    statut: row.statut || base.statut,
    abonnement: row.abonnement ?? base.abonnement,
    adhesion: row.adhesion || base.adhesion,
    chapitreId: orgChanged ? undefined : base.chapitreId,
    districtId: orgChanged ? undefined : base.districtId,
    groupeId: orgChanged ? undefined : base.groupeId,
  };
}

function createImportedMember(row: ParsedImportMember, id: number): MemberRecord {
  const departement = row.departement || row.categorie || "Homme";
  return {
    id,
    prenom: row.prenom.trim(),
    nom: row.nom.trim(),
    email: row.email.trim().toLowerCase(),
    telephone: (row.telephone || "").trim(),
    dateNaissance: row.dateNaissance || "",
    departement,
    categorie: row.categorie || row.departement || "Homme",
    responsabilite: row.responsabilite || "Membre simple",
    dateDebutPratique: row.dateDebutPratique || "",
    abonnementVaguePaix: row.abonnementVaguePaix ?? false,
    gohonzon: row.gohonzon ?? false,
    sokahan: row.sokahan ?? false,
    quartier: row.quartier || "",
    chapitre: row.chapitre || "",
    district: row.district || "",
    groupe: row.groupe || "",
    statut: row.statut || "Actif",
    abonnement: row.abonnement ?? true,
    photo: "",
    adhesion: row.adhesion || new Date().toISOString().slice(0, 10),
    totalDons: 0,
  };
}

export type MembersImportApplyResult = {
  created: MemberRecord[];
  updated: MemberRecord[];
};

export function applyMembersImport(
  imported: ParsedImportMember[],
  existingMembers: MemberRecord[],
  orgFallback?: { chapitre?: string; district?: string; groupe?: string } | null,
): MembersImportApplyResult {
  const remaining = [...existingMembers];
  const created: MemberRecord[] = [];
  const updated: MemberRecord[] = [];
  let nextId = existingMembers.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  for (const raw of imported) {
    const row = {
      ...raw,
      chapitre: raw.chapitre || orgFallback?.chapitre || undefined,
      district: raw.district || orgFallback?.district || undefined,
      groupe: raw.groupe || orgFallback?.groupe || undefined,
    };
    const match = findExistingMember(remaining, row);
    if (match) {
      updated.push(mergeImportedMember(match, row));
      const index = remaining.findIndex((item) => item.id === match.id);
      if (index >= 0) remaining.splice(index, 1);
      continue;
    }
    created.push(createImportedMember(row, nextId++));
  }

  return { created, updated };
}

export function createMembersFromImport(
  imported: ParsedImportMember[],
  existingMembers: MemberRecord[],
): MemberRecord[] {
  const { created, updated } = applyMembersImport(imported, existingMembers);
  return [...updated, ...created];
}
