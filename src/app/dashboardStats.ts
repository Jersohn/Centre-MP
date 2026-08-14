import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import type { MemberRecord } from "./memberFormUtils";
import type { PlatformRole } from "./roles";

export type DashboardCollecteLike = {
  type: "vague-paix" | "zaimu-ordinaire" | "zaimu-special" | string;
  montant: number;
  statut: string;
  membre: string;
  chapitre?: string;
  district?: string;
  groupe?: string;
};

export type UnitStat = {
  key: string;
  label: string;
  membres: number;
  actifs: number;
  vaguePaix: number;
  gohonzon: number;
  zaimuOrdinaire: number;
  zaimuSpecial: number;
};

export type DashboardOrgSnapshot = {
  chapitres: Array<{ id: string; name: string }>;
  districts: Array<{ id: string; name: string; chapitre_id: string; chapitre_name?: string | null }>;
  groupes: Array<{
    id: string;
    name: string;
    district_id: string;
    district_name?: string | null;
    chapitre_id?: string | null;
    chapitre_name?: string | null;
  }>;
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

function memberKey(prenom: string, nom: string) {
  return `${prenom} ${nom}`.trim().toLowerCase();
}

function statsForUnit(
  list: MemberRecord[],
  collectes: DashboardCollecteLike[],
): Omit<UnitStat, "key" | "label"> {
  const names = new Set(list.map((m) => memberKey(m.prenom, m.nom)));
  const ofUnit = collectes.filter(
    (c) => c.statut === "Validé" && names.has((c.membre || "").trim().toLowerCase()),
  );
  return {
    membres: list.length,
    actifs: list.filter((m) => m.statut === "Actif").length,
    vaguePaix: list.filter((m) => m.abonnementVaguePaix).length,
    gohonzon: list.filter((m) => m.gohonzon).length,
    zaimuOrdinaire: ofUnit
      .filter((c) => c.type === "zaimu-ordinaire")
      .reduce((sum, c) => sum + c.montant, 0),
    zaimuSpecial: ofUnit
      .filter((c) => c.type === "zaimu-special")
      .reduce((sum, c) => sum + c.montant, 0),
  };
}

function membersOf(
  members: MemberRecord[],
  match: { chapitre?: string; district?: string; groupe?: string },
) {
  return members.filter((m) => {
    if (match.chapitre && m.chapitre !== match.chapitre) return false;
    if (match.district && m.district !== match.district) return false;
    if (match.groupe && m.groupe !== match.groupe) return false;
    return true;
  });
}

function namesHint(names: string[], max = 4) {
  const clean = names.map((name) => name.trim()).filter(Boolean);
  if (!clean.length) return "";
  if (clean.length <= max) return clean.join(" · ");
  return `${clean.slice(0, max).join(" · ")} +${clean.length - max}`;
}

function rowsFromUnits(
  units: Array<{ key: string; label: string }>,
  members: MemberRecord[],
  collectes: DashboardCollecteLike[],
  pick: (unitLabel: string) => MemberRecord[],
): UnitStat[] {
  return units.map((unit) => ({
    key: unit.key,
    label: unit.label,
    ...statsForUnit(pick(unit.label), collectes),
  }));
}

export function buildDashboardScope(
  role: PlatformRole,
  members: MemberRecord[],
  org: DashboardOrgSnapshot = { chapitres: [], districts: [], groupes: [] },
  collectes: DashboardCollecteLike[] = [],
  assignment: { chapitre?: string; district?: string; groupe?: string } = {},
): DashboardScope {
  const chapitreCount = org.chapitres.length;
  const actifs = members.filter((m) => m.statut === "Actif").length;
  const gohonzonCount = members.filter((m) => m.gohonzon).length;
  const vaguePaixCount = members.filter((m) => m.abonnementVaguePaix).length;
  const validated = collectes.filter((c) => c.statut === "Validé");
  const vaguePaixTotal = validated
    .filter((c) => c.type === "vague-paix")
    .reduce((sum, c) => sum + c.montant, 0);
  const zaimuOrdinaireTotal = validated
    .filter((c) => c.type === "zaimu-ordinaire")
    .reduce((sum, c) => sum + c.montant, 0);
  const zaimuSpecialTotal = validated
    .filter((c) => c.type === "zaimu-special")
    .reduce((sum, c) => sum + c.montant, 0);

  if (role === "district") {
    const districtName =
      (assignment.district || "").trim() ||
      members[0]?.district ||
      org.districts[0]?.name ||
      "";
    const chapitreName = (assignment.chapitre || "").trim() || members[0]?.chapitre || "";
    const districtId = org.districts.find((d) => d.name === districtName)?.id;
    const groupeUnits = org.groupes
      .filter((g) =>
        districtId
          ? g.district_id === districtId
          : !districtName || g.district_name === districtName,
      )
      .map((g) => ({ key: g.id, label: g.name }));
    const units =
      groupeUnits.length > 0
        ? groupeUnits
        : [...new Set(members.map((m) => m.groupe).filter(Boolean))].map((name) => ({
            key: name,
            label: name,
          }));
    const rows = rowsFromUnits(units, members, collectes, (label) =>
      membersOf(members, { groupe: label, district: districtName || undefined }),
    );
    return {
      title: districtName || "Pilotage du district",
      subtitle: chapitreName
        ? `District que vous pilotez · ${chapitreName} · indicateurs par groupe`
        : "District que vous pilotez · effectifs et indicateurs par groupe",
      unitLabel: "Groupe",
      unitPlural: "Groupes",
      kpis: [
        { label: "Membres", value: fmt(members.length), hint: districtName ? `District ${districtName}` : "", tone: "blue" },
        { label: "Groupes", value: fmt(units.length || rows.length), hint: "Groupes du district", tone: "gold" },
        { label: "Vague de Paix", value: fmt(vaguePaixCount), hint: `${fmt(vaguePaixTotal)} FCFA`, tone: "blue" },
        { label: "Gohonzon", value: fmt(gohonzonCount), hint: "Possesseurs", tone: "green" },
        { label: "Zaimu ordinaire", value: fmt(zaimuOrdinaireTotal), hint: "FCFA", tone: "gold" },
        { label: "Zaimu spécial", value: fmt(zaimuSpecialTotal), hint: "FCFA", tone: "red" },
      ],
      rows,
      chartTitle: "Membres par groupe",
    };
  }

  if (role === "chapitre") {
    const chapitreName =
      (assignment.chapitre || "").trim() ||
      members[0]?.chapitre ||
      org.chapitres[0]?.name ||
      "";
    const chapitreId = org.chapitres.find((c) => c.name === chapitreName)?.id;
    const districtUnits = org.districts
      .filter((d) =>
        chapitreId
          ? d.chapitre_id === chapitreId
          : !chapitreName || d.chapitre_name === chapitreName,
      )
      .map((d) => ({ key: d.id, label: d.name }));
    const units =
      districtUnits.length > 0
        ? districtUnits
        : [...new Set(members.map((m) => m.district).filter(Boolean))].map((name) => ({
            key: name,
            label: name,
          }));
    const rows = rowsFromUnits(units, members, collectes, (label) =>
      membersOf(members, { district: label, chapitre: chapitreName || undefined }),
    );
    const groupeCount = org.groupes.filter((g) => {
      if (chapitreId && g.chapitre_id === chapitreId) return true;
      if (chapitreId) {
        return org.districts.some((d) => d.id === g.district_id && d.chapitre_id === chapitreId);
      }
      if (chapitreName && (g.chapitre_name === chapitreName || g.district_name)) {
        return (
          g.chapitre_name === chapitreName ||
          org.districts.some((d) => d.id === g.district_id && d.chapitre_name === chapitreName)
        );
      }
      return false;
    }).length;
    const districtCount = units.length || rows.length;
    return {
      title: chapitreName || "Pilotage du chapitre",
      subtitle: `${districtCount} district${districtCount > 1 ? "s" : ""} · ${groupeCount} groupe${groupeCount > 1 ? "s" : ""} · effectifs par district`,
      unitLabel: "District",
      unitPlural: "Districts",
      kpis: [
        { label: "Membres", value: fmt(members.length), hint: chapitreName ? `Chapitre ${chapitreName}` : "", tone: "blue" },
        { label: "Districts", value: fmt(districtCount), hint: "Dans le chapitre", tone: "gold" },
        { label: "Groupes", value: fmt(groupeCount), hint: "Dans le chapitre", tone: "green" },
        { label: "Vague de Paix", value: fmt(vaguePaixCount), hint: `${fmt(vaguePaixTotal)} FCFA`, tone: "blue" },
        { label: "Gohonzon", value: fmt(gohonzonCount), hint: "Possesseurs", tone: "green" },
        { label: "Zaimu ordinaire", value: fmt(zaimuOrdinaireTotal), hint: "FCFA", tone: "gold" },
        { label: "Zaimu spécial", value: fmt(zaimuSpecialTotal), hint: "FCFA", tone: "red" },
      ],
      rows,
      chartTitle: "Membres par district",
    };
  }

  if (role === "groupe") {
    const groupeName =
      (assignment.groupe || "").trim() ||
      members[0]?.groupe ||
      org.groupes[0]?.name ||
      "Groupe";
    const districtName = (assignment.district || "").trim() || members[0]?.district || "";
    const chapitreName = (assignment.chapitre || "").trim() || members[0]?.chapitre || "";
    const parentLine = [districtName, chapitreName].filter(Boolean).join(" · ");
    const rows = [
      {
        key: groupeName,
        label: groupeName,
        ...statsForUnit(members, collectes),
      },
    ];
    return {
      title: groupeName || "Pilotage du groupe",
      subtitle: parentLine
        ? `Groupe que vous pilotez · ${parentLine}`
        : "Groupe que vous pilotez · membres et indicateurs",
      unitLabel: "Groupe",
      unitPlural: "Groupes",
      kpis: [
        { label: "Membres", value: fmt(members.length), hint: "", tone: "blue" },
        { label: "Actifs", value: fmt(actifs), hint: "", tone: "green" },
        { label: "Vague de Paix", value: fmt(vaguePaixCount), hint: `${fmt(vaguePaixTotal)} FCFA`, tone: "blue" },
        { label: "Gohonzon", value: fmt(gohonzonCount), hint: "Possesseurs", tone: "green" },
        { label: "Zaimu ordinaire", value: fmt(zaimuOrdinaireTotal), hint: "FCFA", tone: "gold" },
        { label: "Zaimu spécial", value: fmt(zaimuSpecialTotal), hint: "FCFA", tone: "red" },
      ],
      rows,
      chartTitle: "Répartition du groupe",
    };
  }

  // admin + centre
  const chapitreUnits = org.chapitres.map((c) => ({ key: c.id, label: c.name }));
  const units =
    chapitreUnits.length > 0
      ? chapitreUnits
      : [...new Set(members.map((m) => m.chapitre).filter(Boolean))].map((name) => ({
          key: name,
          label: name,
        }));
  const rows = rowsFromUnits(units, members, collectes, (label) =>
    membersOf(members, { chapitre: label }),
  );
  const chapterNames = org.chapitres.map((c) => c.name).filter(Boolean);
  const districtCount = org.districts.length;
  const groupeCount = org.groupes.length;

  return {
    title: role === "admin" ? "Administration" : "Centre Miroir Parfait",
    subtitle: `${chapitreCount || units.length} chapitre${(chapitreCount || units.length) > 1 ? "s" : ""}${
      chapterNames.length ? ` (${namesHint(chapterNames, 6)})` : ""
    } · ${districtCount} district${districtCount > 1 ? "s" : ""} · ${groupeCount} groupe${groupeCount > 1 ? "s" : ""}`,
    unitLabel: "Chapitre",
    unitPlural: "Chapitres",
    kpis: [
      {
        label: "Chapitres",
        value: fmt(chapitreCount || units.length),
        hint: namesHint(chapterNames) || "Organisation du centre",
        tone: "gold",
      },
      { label: "Districts", value: fmt(districtCount), hint: "Dans le centre", tone: "blue" },
      { label: "Groupes", value: fmt(groupeCount), hint: "Dans le centre", tone: "green" },
      { label: "Membres", value: fmt(members.length), hint: "", tone: "blue" },
      { label: "Vague de Paix", value: fmt(vaguePaixCount), hint: `${fmt(vaguePaixTotal)} FCFA`, tone: "blue" },
      { label: "Gohonzon", value: fmt(gohonzonCount), hint: "Possesseurs", tone: "green" },
      { label: "Zaimu ordinaire", value: fmt(zaimuOrdinaireTotal), hint: "FCFA", tone: "gold" },
      { label: "Zaimu spécial", value: fmt(zaimuSpecialTotal), hint: "FCFA", tone: "red" },
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
  scopeLabel?: string;
}) {
  const { scope, roleLabel, fromDate, toDate, filename, scopeLabel } = options;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 36;
  let y = 48;

  doc.setFillColor(10, 47, 82);
  doc.rect(0, 0, 595, 72, "F");
  doc.setFillColor(26, 52, 112);
  doc.rect(0, 72, 198, 4, "F");
  doc.setFillColor(200, 151, 26);
  doc.rect(198, 72, 199, 4, "F");
  doc.setFillColor(194, 58, 43);
  doc.rect(397, 72, 198, 4, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Centre Miroir Parfait - SGI Cote d'Ivoire", margin, 34);
  doc.setFontSize(11);
  doc.text(scope.title, margin, 54);

  y = 104;
  doc.setTextColor(16, 32, 51);
  doc.setFontSize(12);
  doc.text(`Profil : ${roleLabel}`, margin, y);
  y += 18;
  doc.text(`Periode d'export : du ${fromDate} au ${toDate}`, margin, y);
  y += 18;
  if (scopeLabel) {
    doc.text(`Perimetre : ${scopeLabel}`, margin, y);
    y += 18;
  }
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
    doc.roundedRect(margin, y - 10, 523, 28, 4, 4, "F");
    doc.setTextColor(10, 47, 82);
    const detail = kpi.hint ? `  (${kpi.hint})` : "";
    doc.text(`${kpi.label} : ${kpi.value}${detail}`, margin + 10, y + 8);
    y += 34;
  });

  y += 10;
  doc.setFontSize(13);
  doc.setTextColor(16, 32, 51);
  doc.text(`Detail par ${scope.unitLabel.toLowerCase()}`, margin, y);
  y += 20;

  doc.setFillColor(10, 47, 82);
  doc.rect(margin, y - 12, 523, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(scope.unitLabel, margin + 6, y);
  doc.text("Membres", margin + 108, y);
  doc.text("Actifs", margin + 158, y);
  doc.text("VP", margin + 202, y);
  doc.text("Gohonzon", margin + 238, y);
  doc.text("Zaimu ord.", margin + 310, y);
  doc.text("Zaimu spe.", margin + 400, y);
  y += 18;

  doc.setTextColor(16, 32, 51);
  scope.rows.forEach((row, index) => {
    if (y > 760) {
      doc.addPage();
      y = 50;
    }
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 11, 523, 18, "F");
    }
    doc.setFontSize(8);
    doc.text(row.label.slice(0, 18), margin + 6, y);
    doc.text(String(row.membres), margin + 108, y);
    doc.text(String(row.actifs), margin + 158, y);
    doc.text(String(row.vaguePaix), margin + 202, y);
    doc.text(String(row.gohonzon), margin + 238, y);
    doc.text(fmt(row.zaimuOrdinaire), margin + 310, y);
    doc.text(fmt(row.zaimuSpecial), margin + 400, y);
    y += 18;
  });

  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  doc.text(`Document genere le ${new Date().toLocaleString("fr-FR")} - Usage interne SGI`, margin, Math.min(y, 820));

  doc.save(filename);
}

export function exportDashboardExcel(options: {
  scope: DashboardScope;
  roleLabel: string;
  fromDate: string;
  toDate: string;
  filename: string;
  members: MemberRecord[];
  collectes?: DashboardCollecteLike[];
  scopeLabel?: string;
}) {
  const { scope, roleLabel, fromDate, toDate, filename, members, collectes = [], scopeLabel } = options;

  const resume = [
    { Indicateur: "Profil", Valeur: roleLabel },
    { Indicateur: "Périmètre", Valeur: scopeLabel || scope.title },
    { Indicateur: "Période début", Valeur: fromDate },
    { Indicateur: "Période fin", Valeur: toDate },
    { Indicateur: "Titre", Valeur: scope.title },
    ...scope.kpis.map((kpi) => ({ Indicateur: kpi.label, Valeur: kpi.value, Detail: kpi.hint || "" })),
  ];

  const detail = scope.rows.map((row) => ({
    [scope.unitLabel]: row.label,
    Membres: row.membres,
    Actifs: row.actifs,
    "Vague de Paix": row.vaguePaix,
    Gohonzon: row.gohonzon,
    "Zaimu ordinaire (FCFA)": row.zaimuOrdinaire,
    "Zaimu spécial (FCFA)": row.zaimuSpecial,
  }));

  const membresSheet = members.map((m) => {
    const name = memberKey(m.prenom, m.nom);
    const ofMember = collectes.filter(
      (c) => c.statut === "Validé" && (c.membre || "").trim().toLowerCase() === name,
    );
    return {
      Prénom: m.prenom,
      Nom: m.nom,
      Email: m.email,
      Chapitre: m.chapitre,
      District: m.district,
      Groupe: m.groupe,
      Statut: m.statut,
      "Vague de Paix": m.abonnementVaguePaix ? "Oui" : "Non",
      Gohonzon: m.gohonzon ? "Oui" : "Non",
      Sokahan: m.sokahan ? "Oui" : "Non",
      "Zaimu ordinaire (FCFA)": ofMember
        .filter((c) => c.type === "zaimu-ordinaire")
        .reduce((s, c) => s + c.montant, 0),
      "Zaimu spécial (FCFA)": ofMember
        .filter((c) => c.type === "zaimu-special")
        .reduce((s, c) => s + c.montant, 0),
    };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resume), "Résumé");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detail), `Par ${scope.unitLabel}`);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(membresSheet), "Membres");
  XLSX.writeFile(workbook, filename);
}
