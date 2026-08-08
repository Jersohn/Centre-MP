import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { MemberRecord } from "./memberFormUtils";
import type { PlatformRole } from "./roles";

export type UnitStat = {
  key: string;
  label: string;
  membres: number;
  actifs: number;
  vaguePaix: number;
  zaimu: number;
  dons: number;
};

export type DashboardScope = {
  title: string;
  subtitle: string;
  unitLabel: string;
  unitPlural: string;
  kpis: { label: string; value: string; hint: string; tone: "blue" | "gold" | "red" | "green" }[];
  rows: UnitStat[];
  chartTitle: string;
};

/** ASCII-safe : évite \u202f (fr-FR) mal rendu en PDF comme "/". */
const fmt = (n: number) => {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  return `${sign}${String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
};

function aggregateBy(members: MemberRecord[], key: keyof MemberRecord): UnitStat[] {
  const map = new Map<string, MemberRecord[]>();
  for (const member of members) {
    const label = String(member[key] || "Non renseigné");
    const list = map.get(label) || [];
    list.push(member);
    map.set(label, list);
  }
  return [...map.entries()]
    .map(([label, list]) => ({
      key: label,
      label,
      membres: list.length,
      actifs: list.filter((m) => m.statut === "Actif").length,
      vaguePaix: list.filter((m) => m.abonnementVaguePaix).length,
      zaimu: list.reduce((sum, m) => sum + m.totalDons, 0),
      dons: list.reduce((sum, m) => sum + m.totalDons, 0),
    }))
    .sort((a, b) => b.membres - a.membres);
}

export function buildDashboardScope(role: PlatformRole, members: MemberRecord[]): DashboardScope {
  if (role === "district") {
    const rows = aggregateBy(members, "groupe");
    const chapterCount = new Set(members.map((m) => m.chapitre)).size;
    return {
      title: "Pilotage du district",
      subtitle: "Effectifs et indicateurs par groupe du district",
      unitLabel: "Groupe",
      unitPlural: "Groupes",
      kpis: [
        { label: "Membres du district", value: fmt(members.length), hint: "Tous groupes confondus", tone: "blue" },
        { label: "Groupes", value: fmt(rows.length), hint: "Unités actives", tone: "gold" },
        { label: "Chapitres liés", value: fmt(chapterCount), hint: "Périmètre du district", tone: "red" },
        {
          label: "Vague de Paix",
          value: fmt(members.filter((m) => m.abonnementVaguePaix).length),
          hint: "Abonnés année en cours",
          tone: "green",
        },
      ],
      rows,
      chartTitle: "Membres par groupe",
    };
  }

  if (role === "chapitre") {
    const rows = aggregateBy(members, "district");
    return {
      title: "Pilotage du chapitre",
      subtitle: "Nombre de districts et statistiques détaillées par district",
      unitLabel: "District",
      unitPlural: "Districts",
      kpis: [
        { label: "Membres du chapitre", value: fmt(members.length), hint: "Tous districts", tone: "blue" },
        { label: "Districts", value: fmt(rows.length), hint: "Sous le chapitre", tone: "gold" },
        {
          label: "Membres actifs",
          value: fmt(members.filter((m) => m.statut === "Actif").length),
          hint: "Statut Actif",
          tone: "green",
        },
        {
          label: "Zaimu cumulés",
          value: fmt(members.reduce((s, m) => s + m.totalDons, 0)),
          hint: "CDF",
          tone: "red",
        },
      ],
      rows,
      chartTitle: "Membres par district",
    };
  }

  if (role === "groupe") {
    const rows = aggregateBy(members, "groupe");
    return {
      title: "Pilotage du groupe",
      subtitle: "Vue des membres et indicateurs du groupe",
      unitLabel: "Groupe",
      unitPlural: "Groupes",
      kpis: [
        { label: "Membres", value: fmt(members.length), hint: "Dans le groupe", tone: "blue" },
        {
          label: "Actifs",
          value: fmt(members.filter((m) => m.statut === "Actif").length),
          hint: "Statut Actif",
          tone: "green",
        },
        {
          label: "Vague de Paix",
          value: fmt(members.filter((m) => m.abonnementVaguePaix).length),
          hint: "Abonnés",
          tone: "gold",
        },
        {
          label: "Dons zaimu",
          value: fmt(members.reduce((s, m) => s + m.totalDons, 0)),
          hint: "CDF",
          tone: "red",
        },
      ],
      rows,
      chartTitle: "Répartition du groupe",
    };
  }

  // admin + centre
  const rows = aggregateBy(members, "chapitre");
  return {
    title: "Pilotage du centre",
    subtitle: "Nombre de chapitres et statistiques consolidées par chapitre",
    unitLabel: "Chapitre",
    unitPlural: "Chapitres",
    kpis: [
      { label: "Membres du centre", value: fmt(members.length), hint: "Tous chapitres", tone: "blue" },
      { label: "Chapitres", value: fmt(rows.length), hint: "Unités territoriales", tone: "gold" },
      {
        label: "Districts",
        value: fmt(new Set(members.map((m) => m.district)).size),
        hint: "Tous chapitres",
        tone: "red",
      },
      {
        label: "Groupes",
        value: fmt(new Set(members.map((m) => m.groupe)).size),
        hint: "Tous niveaux",
        tone: "green",
      },
    ],
    rows,
    chartTitle: "Membres par chapitre",
  };
}

export function exportDashboardPdf(options: {
  scope: DashboardScope;
  roleLabel: string;
  fromDate: string;
  toDate: string;
  filename: string;
}) {
  const { scope, roleLabel, fromDate, toDate, filename } = options;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = 48;

  // Header band
  doc.setFillColor(10, 47, 82);
  doc.rect(0, 0, 595, 72, "F");
  doc.setFillColor(200, 151, 26);
  doc.rect(0, 72, 198, 4, "F");
  doc.setFillColor(194, 58, 43);
  doc.rect(198, 72, 397, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Centre Miroir Parfait — SGI Côte d’Ivoire", margin, 34);
  doc.setFontSize(11);
  doc.text(scope.title, margin, 54);

  y = 104;
  doc.setTextColor(16, 32, 51);
  doc.setFontSize(12);
  doc.text(`Profil : ${roleLabel}`, margin, y);
  y += 18;
  doc.text(`Période d’export : ${fromDate} → ${toDate}`, margin, y);
  y += 18;
  doc.setTextColor(90, 107, 125);
  doc.setFontSize(10);
  doc.text(scope.subtitle, margin, y);
  y += 28;

  doc.setTextColor(16, 32, 51);
  doc.setFontSize(13);
  doc.text("Indicateurs clés", margin, y);
  y += 16;
  doc.setFontSize(10);
  scope.kpis.forEach((kpi) => {
    doc.setFillColor(243, 246, 250);
    doc.roundedRect(margin, y - 10, 515, 28, 4, 4, "F");
    doc.setTextColor(10, 47, 82);
    doc.text(`${kpi.label} : ${kpi.value}  (${kpi.hint})`, margin + 10, y + 8);
    y += 34;
  });

  y += 10;
  doc.setFontSize(13);
  doc.setTextColor(16, 32, 51);
  doc.text(`Détail par ${scope.unitLabel.toLowerCase()}`, margin, y);
  y += 20;

  doc.setFillColor(10, 47, 82);
  doc.rect(margin, y - 12, 515, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(scope.unitLabel, margin + 8, y);
  doc.text("Membres", margin + 160, y);
  doc.text("Actifs", margin + 230, y);
  doc.text("Vague Paix", margin + 290, y);
  doc.text("Zaimu", margin + 370, y);
  doc.text("Dons", margin + 460, y);
  y += 18;

  doc.setTextColor(16, 32, 51);
  scope.rows.forEach((row, index) => {
    if (y > 760) {
      doc.addPage();
      y = 50;
    }
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 11, 515, 18, "F");
    }
    doc.setFontSize(9);
    doc.text(row.label.slice(0, 28), margin + 8, y);
    doc.text(String(row.membres), margin + 160, y);
    doc.text(String(row.actifs), margin + 230, y);
    doc.text(String(row.vaguePaix), margin + 290, y);
    doc.text(`${fmt(row.zaimu)}`, margin + 370, y);
    doc.text(`${fmt(row.dons)}`, margin + 460, y);
    y += 18;
  });

  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text(`Document généré le ${new Date().toLocaleString("fr-FR")} — Usage interne SGI`, margin, Math.min(y, 820));

  doc.save(filename);
}

export function exportDashboardExcel(options: {
  scope: DashboardScope;
  roleLabel: string;
  fromDate: string;
  toDate: string;
  filename: string;
  members: MemberRecord[];
}) {
  const { scope, roleLabel, fromDate, toDate, filename, members } = options;

  const resume = [
    { Indicateur: "Profil", Valeur: roleLabel },
    { Indicateur: "Période début", Valeur: fromDate },
    { Indicateur: "Période fin", Valeur: toDate },
    { Indicateur: "Titre", Valeur: scope.title },
    ...scope.kpis.map((kpi) => ({ Indicateur: kpi.label, Valeur: kpi.value, Detail: kpi.hint })),
  ];

  const detail = scope.rows.map((row) => ({
    [scope.unitLabel]: row.label,
    Membres: row.membres,
    Actifs: row.actifs,
    "Vague de Paix": row.vaguePaix,
    "Zaimu (CDF)": row.zaimu,
    "Dons zaimu (CDF)": row.dons,
  }));

  const membresSheet = members.map((m) => ({
    Prénom: m.prenom,
    Nom: m.nom,
    Email: m.email,
    Chapitre: m.chapitre,
    District: m.district,
    Groupe: m.groupe,
    Statut: m.statut,
    "Vague de Paix": m.abonnementVaguePaix ? "Oui" : "Non",
    "Zaimu (CDF)": m.totalDons,
    "Dons (CDF)": m.totalDons,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resume), "Résumé");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detail), `Par ${scope.unitLabel}`);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(membresSheet), "Membres");
  XLSX.writeFile(workbook, filename);
}
