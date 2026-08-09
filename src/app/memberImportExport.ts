import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { MemberFormValues, MemberRecord } from "./memberFormUtils";
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
  { key: "VagueDePaix", label: "Vague de Paix" },
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
  "Statut",
  "VagueDePaix",
  "Sokahan",
];

export const ZAIMU_BILAN_EXPORT_FIELDS: ExportFieldOption[] = [
  { key: "Membre", label: "Membre", group: "Bilan cota" },
  { key: "Email", label: "Email", group: "Bilan cota" },
  { key: "Chapitre", label: "Chapitre", group: "Bilan cota" },
  { key: "District", label: "District", group: "Bilan cota" },
  { key: "Groupe", label: "Groupe", group: "Bilan cota" },
  { key: "Cota assignée (CDF)", label: "Cota assignée", group: "Bilan cota" },
  { key: "Payé validé (CDF)", label: "Payé validé", group: "Bilan cota" },
  { key: "Reste (CDF)", label: "Montant restant", group: "Bilan cota" },
  { key: "Nb paiements", label: "Nb paiements", group: "Bilan cota" },
  { key: "Dernier paiement", label: "Dernier paiement", group: "Bilan cota" },
  { key: "Statut cota", label: "Statut cota", group: "Bilan cota" },
];

export const ZAIMU_PAYMENT_EXPORT_FIELDS: ExportFieldOption[] = [
  { key: "Référence", label: "N° enregistrement", group: "Paiements" },
  { key: "Référence reçu", label: "Référence reçu", group: "Paiements" },
  { key: "Date", label: "Date", group: "Paiements" },
  { key: "Membre", label: "Membre", group: "Paiements" },
  { key: "Montant (CDF)", label: "Montant", group: "Paiements" },
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
  "Cota assignée (CDF)",
  "Payé validé (CDF)",
  "Reste (CDF)",
  "Statut cota",
  "Référence",
  "Référence reçu",
  "Date",
  "Montant (CDF)",
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
  const withoutReste = withMember.filter((f) => f !== "Reste (CDF)");
  const payeIdx = withoutReste.indexOf("Payé validé (CDF)");
  if (payeIdx >= 0) {
    return [
      ...withoutReste.slice(0, payeIdx + 1),
      "Reste (CDF)",
      ...withoutReste.slice(payeIdx + 1),
    ];
  }
  const cotaIdx = withoutReste.indexOf("Cota assignée (CDF)");
  if (cotaIdx >= 0) {
    return [
      ...withoutReste.slice(0, cotaIdx + 1),
      "Reste (CDF)",
      ...withoutReste.slice(cotaIdx + 1),
    ];
  }
  return [...withoutReste.slice(0, 1), "Reste (CDF)", ...withoutReste.slice(1)];
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
  return /cdf|montant|cota|payé|paye|reste|assigne|assigné|dons|zaimu/i.test(key);
}

function drawDynamicPdfTable(
  doc: jsPDF,
  rows: Record<string, unknown>[],
  fields: string[],
  labels: Record<string, string>,
  startY: number,
  headerColor: [number, number, number]
) {
  const margin = 36;
  const usable = 842 - margin * 2;
  const weights = fields.map((key) => (isAmountField(key) ? 1.35 : 1));
  const weightSum = weights.reduce((a, b) => a + b, 0) || 1;
  const widths = weights.map((w) => (usable * w) / weightSum);
  let y = startY;
  let x = margin;

  doc.setFillColor(...headerColor);
  doc.rect(margin, y - 11, usable, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  fields.forEach((key, i) => {
    const label = sanitizeExportText(labels[key] || key);
    const maxLabel = Math.max(4, Math.floor(widths[i] / 4.2));
    doc.text(label.slice(0, maxLabel), x + 2, y);
    x += widths[i];
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
    fields.forEach((key, i) => {
      const text = formatCell(row[key]);
      // Ne pas couper les montants au milieu (sinon "1 200 000" → "1 /200" avec fontes PDF)
      const maxChars = isAmountField(key)
        ? Math.max(text.length, Math.floor(widths[i] / 3.6))
        : Math.max(6, Math.floor(widths[i] / 4.2));
      doc.text(text.slice(0, maxChars), x + 2, y);
      x += widths[i];
    });
    y += 15;
  });

  return y;
}

const EXAMPLE_ROW: Record<MemberImportColumn, string> = {
  Prenom: "Awa",
  Nom: "Traoré",
  Email: "awa.traore@email.com",
  Telephone: "+225 07 00 00 00 00",
  DateNaissance: "1995-04-12",
  Departement: "Culture",
  Categorie: "Femme",
  Responsabilite: "Membre simple",
  DateDebutPratique: "2019-01-15",
  VagueDePaix: "Oui",
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
  { Champ: "Prenom / Nom / Email", Regle: "Obligatoires" },
  { Champ: "Categorie", Regle: "Homme | Femme | Jeune homme | Jeune fille | Avenir" },
  {
    Champ: "Responsabilite",
    Regle: "Membre simple | Responsable groupe | Responsable district | Responsable chapitre | Responsable centre",
  },
  { Champ: "VagueDePaix / Sokahan / Abonnement", Regle: "Oui ou Non" },
  { Champ: "Statut", Regle: "Actif | En attente | Suspendu" },
  { Champ: "Dates", Regle: "Format AAAA-MM-JJ (ex. 2026-08-01)" },
  { Champ: "Chapitre / District / Groupe", Regle: "Respecter les libellés déjà utilisés dans l’application" },
];

function yesNo(value: boolean) {
  return value ? "Oui" : "Non";
}

function parseYesNo(value: unknown, fallback = false) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return fallback;
  return ["oui", "yes", "true", "1", "o", "y"].includes(raw);
}

function cell(row: Record<string, unknown>, key: string) {
  const exact = row[key];
  if (exact !== undefined && exact !== null && String(exact).trim() !== "") return String(exact).trim();
  const found = Object.entries(row).find(([k]) => k.trim().toLowerCase() === key.toLowerCase());
  return found ? String(found[1] ?? "").trim() : "";
}

export function memberToImportRow(member: MemberRecord): Record<MemberImportColumn, string> {
  return {
    Prenom: member.prenom,
    Nom: member.nom,
    Email: member.email,
    Telephone: member.telephone,
    DateNaissance: member.dateNaissance,
    Departement: member.departement,
    Categorie: member.categorie,
    Responsabilite: member.responsabilite === "Membre" ? "Membre simple" : member.responsabilite,
    DateDebutPratique: member.dateDebutPratique,
    VagueDePaix: yesNo(member.abonnementVaguePaix),
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
  fields: string[] = MEMBER_EXPORT_DEFAULT_FIELDS
) {
  const selected = ensureLeadingNameFields(
    fields.length ? fields : MEMBER_EXPORT_DEFAULT_FIELDS,
    ["Prenom", "Nom"]
  );
  const rows = members.map((m) => sanitizeRowForExcel(pickRowFields(memberToImportRow(m), selected)));
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(
    rows.length ? rows : [Object.fromEntries(selected.map((c) => [c, ""]))],
    { header: selected }
  );
  XLSX.utils.book_append_sheet(workbook, sheet, "Membres");
  XLSX.writeFile(workbook, filename);
}

export function exportMembersPdf(
  members: MemberRecord[],
  options: { title?: string; filename: string; fields?: string[] }
) {
  const selected = ensureLeadingNameFields(
    options.fields?.length ? options.fields : MEMBER_EXPORT_DEFAULT_FIELDS,
    ["Prenom", "Nom"]
  );
  const labels = Object.fromEntries(MEMBER_EXPORT_FIELDS.map((f) => [f.key, f.label]));
  const rows = members.map((m) => pickRowFields(memberToImportRow(m), selected));
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
  doc.text("Centre Miroir Parfait — Liste des membres", margin, 28);
  doc.setFontSize(10);
  doc.text(options.title || "Export membres", margin, 46);

  y = 84;
  doc.setTextColor(16, 32, 51);
  doc.setFontSize(10);
  doc.text(
    `Total : ${members.length} membre(s) · ${selected.length} champ(s) — ${new Date().toLocaleString("fr-FR")}`,
    margin,
    y
  );
  y += 20;
  drawDynamicPdfTable(doc, rows, selected, labels, y, [10, 47, 82]);
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
      "Cota assignée (CDF)": assigne,
      "Payé validé (CDF)": payeValide || paye,
      "Reste (CDF)": reste,
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
      "Montant (CDF)": c.montant,
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
  doc.text("Centre Miroir Parfait — Paiements Zaimu spécial", margin, 28);
  doc.setFontSize(10);
  doc.text(options.title || ZAIMU_SPECIAL_CAMPAIGN.label, margin, 46);

  y = 84;
  doc.setTextColor(16, 32, 51);
  doc.setFontSize(10);
  const totalPaye = bilan.reduce((s, r) => s + Number(r["Payé validé (CDF)"] || 0), 0);
  const totalAssigne = bilan.reduce((s, r) => s + Number(r["Cota assignée (CDF)"] || 0), 0);
  doc.text(
    `Membres : ${bilan.length} · Paiements : ${paiements.length} · Cota ${formatExportNumber(totalAssigne)} · Payé ${formatExportNumber(totalPaye)} CDF`,
    margin,
    y
  );
  y += 22;

  if (bilanFields.length) {
    doc.setFontSize(11);
    doc.text("1. Bilan cota par membre", margin, y);
    y += 14;
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
    doc.setFontSize(11);
    doc.setTextColor(16, 32, 51);
    doc.text(`${bilanFields.length ? "2" : "1"}. Détail des paiements`, margin, y);
    y += 14;
    drawDynamicPdfTable(
      doc,
      paiements.map((r) => pickRowFields(r, paymentFields)),
      paymentFields,
      labels,
      y,
      [194, 58, 43]
    );
  }

  doc.save(options.filename);
}

export type ParsedImportMember = MemberFormValues & { adhesion: string };

export type ImportParseResult = {
  members: ParsedImportMember[];
  errors: string[];
};

export function parseMembersImportWorkbook(data: ArrayBuffer): ImportParseResult {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames.includes("Membres") ? "Membres" : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const members: ParsedImportMember[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const prenom = cell(row, "Prenom");
    const nom = cell(row, "Nom");
    const email = cell(row, "Email").toLowerCase();

    // skip empty / example-only blanks
    if (!prenom && !nom && !email) return;

    // skip the demo example row if left unchanged? keep it — user may want it
    if (!prenom || !nom || !email) {
      errors.push(`Ligne ${line} : Prénom, Nom et Email sont obligatoires.`);
      return;
    }
    if (!email.includes("@")) {
      errors.push(`Ligne ${line} : Email invalide (${email}).`);
      return;
    }

    members.push({
      prenom,
      nom,
      email,
      telephone: cell(row, "Telephone"),
      dateNaissance: cell(row, "DateNaissance"),
      departement: cell(row, "Departement"),
      categorie: cell(row, "Categorie") || "Homme",
      responsabilite: cell(row, "Responsabilite") || "Membre simple",
      dateDebutPratique: cell(row, "DateDebutPratique"),
      abonnementVaguePaix: parseYesNo(cell(row, "VagueDePaix")),
      sokahan: parseYesNo(cell(row, "Sokahan")),
      quartier: cell(row, "Quartier"),
      chapitre: cell(row, "Chapitre") || "Rissho Ankoku Ron",
      district: cell(row, "District") || "District Bodhisattva",
      groupe: cell(row, "Groupe") || "BODDHISATTVA",
      statut: cell(row, "Statut") || "Actif",
      abonnement: parseYesNo(cell(row, "Abonnement"), true),
      photo: "",
      adhesion: cell(row, "DateAdhesion") || new Date().toISOString().slice(0, 10),
    });
  });

  return { members, errors };
}

export function createMembersFromImport(
  imported: ParsedImportMember[],
  existingMembers: MemberRecord[]
): MemberRecord[] {
  let nextId = existingMembers.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  return imported.map((values) => {
    const record: MemberRecord = {
      id: nextId++,
      prenom: values.prenom.trim(),
      nom: values.nom.trim(),
      email: values.email.trim().toLowerCase(),
      telephone: values.telephone.trim(),
      dateNaissance: values.dateNaissance,
      departement: values.departement,
      categorie: values.categorie,
      responsabilite: values.responsabilite,
      dateDebutPratique: values.dateDebutPratique,
      abonnementVaguePaix: values.abonnementVaguePaix,
      sokahan: values.sokahan,
      quartier: values.quartier,
      chapitre: values.chapitre,
      district: values.district,
      groupe: values.groupe || "BODDHISATTVA",
      statut: values.statut,
      abonnement: values.abonnement,
      photo: "",
      adhesion: values.adhesion || new Date().toISOString().slice(0, 10),
      totalDons: 0,
    };
    return record;
  });
}
