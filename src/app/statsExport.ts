import { jsPDF } from "jspdf";
import { formatExportNumber } from "./memberImportExport";
import type { MemberListKpis } from "./memberListStats";

const COLORS = {
  blue: [10, 47, 82] as const,
  blueSoft: [26, 52, 112] as const,
  gold: [200, 151, 26] as const,
  red: [194, 58, 43] as const,
  green: [31, 122, 69] as const,
  ink: [16, 32, 51] as const,
  muted: [90, 107, 125] as const,
  line: [226, 232, 240] as const,
  zebra: [248, 250, 252] as const,
  card: [243, 246, 250] as const,
  white: [255, 255, 255] as const,
};

type StatsPdfOptions = {
  roleLabel: string;
  consolidationHint: string;
  reportTitle?: string;
  scopeLabel?: string;
  fromDateLabel: string;
  toDateLabel: string;
  filename: string;
  kpis: MemberListKpis;
  summary: {
    totalTransactions: number;
    uniqueMembers: number;
    totalCotisations: number;
    totalZaimuOrdinaire: number;
    totalZaimuSpecial: number;
    totalAbonnements: number;
  };
};

function sanitize(value: string) {
  return value
    .replace(/[\u00a0\u202f\u2007\u2009]/g, " ")
    .replace(/[→⟶‒–—―]/g, "-")
    .replace(/[’‘‛]/g, "'")
    .replace(/[·•]/g, " - ");
}

function money(n: number) {
  return `${formatExportNumber(n)} FCFA`;
}

function drawTricolor(doc: jsPDF, y: number, height = 5) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.blue);
  doc.rect(0, y, pageW / 3, height, "F");
  doc.setFillColor(...COLORS.gold);
  doc.rect(pageW / 3, y, pageW / 3, height, "F");
  doc.setFillColor(...COLORS.red);
  doc.rect((pageW * 2) / 3, y, pageW / 3, height, "F");
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    drawTricolor(doc, pageH - 42, 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Document genere le ${new Date().toLocaleString("fr-FR")} - Usage interne SGI`,
      40,
      pageH - 22,
    );
    doc.text(`Page ${i} / ${pageCount}`, pageW - 40, pageH - 22, { align: "right" });
  }
}

function drawSectionLabel(doc: jsPDF, label: string, y: number, x = 40) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.blue);
  doc.text(sanitize(label).toUpperCase(), x, y);
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(2.2);
  doc.line(x, y + 6, x + 72, y + 6);
  return y + 22;
}

function drawAccentCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: readonly [number, number, number],
  label: string,
  value: string,
  hint?: string,
) {
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.line);
  doc.setLineWidth(0.8);
  doc.roundedRect(x, y, w, h, 8, 8, "FD");
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 5, h, 2, 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text(sanitize(label), x + 16, y + 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.blue);
  doc.text(sanitize(value), x + 16, y + 36);

  if (hint) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(sanitize(hint), x + 16, y + 50);
  }
}

export function exportStatisticsPdf(options: StatsPdfOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 80;
  const { kpis, summary } = options;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.blue);
  doc.rect(0, 0, pageW, 96, "F");
  drawTricolor(doc, 96, 5);

  doc.setTextColor(...COLORS.gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CENTRE MIROIR PARFAIT  |  SGI COTE D'IVOIRE", 40, 28);

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  const title = sanitize(options.reportTitle || "Bilan consolide du Centre");
  doc.text(title.length > 52 ? `${title.slice(0, 50)}...` : title, 40, 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(220, 230, 240);
  doc.text(
    sanitize(`${options.roleLabel} - ${options.consolidationHint}`),
    40,
    74,
  );
  doc.text("Document de presentation", pageW - 40, 74, { align: "right" });

  let y = 126;

  // ── Period block ────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.card);
  doc.roundedRect(40, y, contentW, 72, 10, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.blue);
  doc.text("PERIODE ET PERIMETRE", 56, y + 16);

  const chipH = 22;
  const chipY = y + 22;
  const chipW = 122;
  const fromX = 56;
  const toX = fromX + chipW + 42;

  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.blue);
  doc.setLineWidth(0.9);
  doc.roundedRect(fromX, chipY, chipW, chipH, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("DU", fromX + 10, chipY + 14);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  doc.text(sanitize(options.fromDateLabel), fromX + 30, chipY + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gold);
  doc.text("au", fromX + chipW + 14, chipY + 15);

  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.blue);
  doc.roundedRect(toX, chipY, chipW, chipH, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("AU", toX + 10, chipY + 14);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  doc.text(sanitize(options.toDateLabel), toX + 30, chipY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.blue);
  const scopeHint = sanitize(options.scopeLabel || "Vue globale centre");
  doc.text(
    `Perimetre : ${scopeHint.length > 78 ? `${scopeHint.slice(0, 76)}...` : scopeHint}`,
    56,
    y + 60,
  );

  y += 96;

  // ── Hero KPIs ───────────────────────────────────────────────────────────
  y = drawSectionLabel(doc, "Points cles consolides", y);

  const heroGap = 12;
  const heroW = (contentW - heroGap * 3) / 4;
  const heroH = 62;
  const heroCards = [
    {
      label: "Membres",
      value: formatExportNumber(kpis.totalMembres),
      hint: "Effectif consolide",
      accent: COLORS.blue,
    },
    {
      label: "Vague de Paix",
      value: formatExportNumber(kpis.abonnesVaguePaix),
      hint: "Abonnes actifs",
      accent: COLORS.green,
    },
    {
      label: "Gohonzon",
      value: formatExportNumber(kpis.gohonzon),
      hint: "Possesseurs",
      accent: COLORS.gold,
    },
    {
      label: "Zaimu special",
      value: money(summary.totalZaimuSpecial),
      hint: "Total periode",
      accent: COLORS.red,
    },
  ];

  heroCards.forEach((card, index) => {
    const x = 40 + index * (heroW + heroGap);
    drawAccentCard(doc, x, y, heroW, heroH, card.accent, card.label, card.value, card.hint);
  });
  y += heroH + 28;

  // ── Financial consolidated ──────────────────────────────────────────────
  y = drawSectionLabel(doc, "Consolidation financiere", y);

  const totalFinance = summary.totalCotisations + summary.totalZaimuSpecial;
  doc.setFillColor(...COLORS.blue);
  doc.roundedRect(40, y, contentW, 70, 10, 10, "F");
  doc.setTextColor(...COLORS.gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VOLUME TOTAL CONSOLIDE", 56, y + 22);
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(22);
  doc.text(money(totalFinance), 56, y + 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(210, 220, 235);
  doc.text(
    `${formatExportNumber(summary.totalTransactions)} transactions validees`,
    pageW - 56,
    y + 28,
    { align: "right" },
  );
  doc.text(
    `${formatExportNumber(summary.uniqueMembers)} membres contributeurs`,
    pageW - 56,
    y + 46,
    { align: "right" },
  );
  y += 90;

  const financeRows = [
    { label: "Cotisations Vague de Paix", value: money(summary.totalCotisations), accent: COLORS.blue },
    { label: "Zaimu special", value: money(kpis.zaimuSpecial), accent: COLORS.red },
    { label: "Abonnements Vague de Paix", value: formatExportNumber(summary.totalAbonnements), accent: COLORS.green },
  ];

  financeRows.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(...COLORS.zebra);
      doc.roundedRect(40, y - 10, contentW, 28, 6, 6, "F");
    }
    doc.setFillColor(...row.accent);
    doc.circle(54, y + 2, 3.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.ink);
    doc.text(sanitize(row.label), 68, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.blue);
    doc.text(sanitize(row.value), pageW - 56, y + 5, { align: "right" });
    y += 30;
  });

  y += 18;

  // ── Demographics ────────────────────────────────────────────────────────
  y = drawSectionLabel(doc, "Composition des effectifs", y);

  const demoGap = 10;
  const demoW = (contentW - demoGap * 2) / 3;
  const demoH = 52;
  const demoCards = [
    { label: "Hommes", value: formatExportNumber(kpis.hommes), accent: COLORS.blue },
    { label: "Femmes", value: formatExportNumber(kpis.femmes), accent: COLORS.gold },
    { label: "Jeunes", value: formatExportNumber(kpis.jeunes), accent: COLORS.blueSoft },
    { label: "Jeunes filles", value: formatExportNumber(kpis.jeunesFilles), accent: COLORS.gold },
    { label: "Avenir", value: formatExportNumber(kpis.avenir), accent: COLORS.green },
    { label: "Sokahan", value: formatExportNumber(kpis.sokahan), accent: COLORS.gold },
    { label: "Gohonzon", value: formatExportNumber(kpis.gohonzon), accent: COLORS.red },
  ];

  demoCards.forEach((card, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 40 + col * (demoW + demoGap);
    const cardY = y + row * (demoH + demoGap);
    drawAccentCard(doc, x, cardY, demoW, demoH, card.accent, card.label, card.value);
  });
  const demoRows = Math.ceil(demoCards.length / 3);
  y += demoRows * demoH + (demoRows - 1) * demoGap + 30;

  // ── Closing note ────────────────────────────────────────────────────────
  doc.setFillColor(...COLORS.card);
  doc.roundedRect(40, y, contentW, 68, 10, 10, "F");
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1.2);
  doc.line(56, y + 14, 56, y + 54);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.blue);
  doc.text("Note de presentation", 70, y + 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.muted);
  const note = doc.splitTextToSize(
    "Ce document presente le point consolide du perimetre du responsable pour la periode selectionnee. Les cumuls de groupe alimentent le district, puis le chapitre, puis le Centre.",
    contentW - 48,
  );
  doc.text(note, 70, y + 40);

  drawFooter(doc);
  doc.save(options.filename);
}
