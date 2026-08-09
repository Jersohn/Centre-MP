import { COLLECTES_SEED } from "../app/CollectesModule";
import { buildDashboardScope } from "../app/dashboardStats";
import { MEMBERS_SEED, memberFullName } from "../app/membersData";
import {
  DEMO_ORG_SCOPE,
  filterMembersByScope,
  type CollecteLike,
} from "../app/memberListStats";
import { ROLE_LABELS, type PlatformRole } from "../app/roles";

type OpChunk = {
  id: string;
  title: string;
  body: string;
};

function filterCollectesByScope(role: PlatformRole) {
  const scope = DEMO_ORG_SCOPE[role];
  return COLLECTES_SEED.filter((c) => {
    if (scope.chapitre && c.chapitre !== scope.chapitre) return false;
    if (scope.district && c.district !== scope.district) return false;
    if (scope.groupe && c.groupe !== scope.groupe) return false;
    return true;
  });
}

function tokenize(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function score(chunk: OpChunk, tokens: string[]): number {
  if (!tokens.length) return 1;
  const hay = `${chunk.title} ${chunk.body}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (hay.includes(t)) s += 2;
    if (chunk.title.toLowerCase().includes(t)) s += 3;
  }
  return s;
}

function countBy(members: ReturnType<typeof filterMembersByScope>, key: "categorie" | "statut" | "groupe" | "district") {
  const map = new Map<string, number>();
  for (const m of members) {
    const label = String(m[key] || "Non renseigné");
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => `${label}: ${n}`)
    .join(" · ");
}

export function buildDashboardContext(role: PlatformRole, question = ""): string {
  const scope = DEMO_ORG_SCOPE[role];
  const members = filterMembersByScope(MEMBERS_SEED, scope);
  const dash = buildDashboardScope(role, members);
  const collectes = filterCollectesByScope(role);

  const byType = (type: CollecteLike["type"]) => collectes.filter((c) => c.type === type);
  const sum = (list: typeof collectes, statut?: string) =>
    list
      .filter((c) => (statut ? c.statut === statut : true))
      .reduce((acc, c) => acc + c.montant, 0);

  const vp = byType("vague-paix");
  const zo = byType("zaimu-ordinaire");
  const zs = byType("zaimu-special");

  const actifs = members.filter((m) => m.statut === "Actif").length;
  const vaguePaix = members.filter((m) => m.abonnementVaguePaix).length;
  const sokahan = members.filter((m) => m.sokahan).length;

  const memberLines = members
    .slice(0, 40)
    .map((m) => {
      const name = memberFullName(m);
      return `- ${name} | ${m.statut} | ${m.categorie} | ${m.groupe} | ${m.district} | VP:${m.abonnementVaguePaix ? "oui" : "non"} | Sokahan:${m.sokahan ? "oui" : "non"} | Zaimu cumul ${m.totalDons} CDF`;
    })
    .join("\n");

  const collecteLines = collectes
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 40)
    .map((c) => {
      const ref = c.referenceRecu?.trim() ? ` | reçu ${c.referenceRecu}` : "";
      return `- [${c.id}] ${c.type} | ${c.date} | ${c.membre} | ${c.montant} CDF | ${c.statut} | ${c.groupe}${c.motif ? ` | ${c.motif}` : ""}${ref}`;
    })
    .join("\n");

  const pending = collectes.filter((c) => c.statut === "En attente");
  const attention = [
    pending.length
      ? `${pending.length} collecte(s) en attente (${pending
          .slice(0, 5)
          .map((c) => `${c.membre} ${c.montant} CDF`)
          .join("; ")})`
      : "Aucune collecte en attente",
    `${members.filter((m) => m.statut !== "Actif").length} membre(s) non actifs`,
    `${members.length - vaguePaix} membre(s) sans abonnement Vague de Paix`,
  ].join("\n- ");

  const chunks: OpChunk[] = [
    {
      id: "perimetre",
      title: "Périmètre et rôle",
      body: `Rôle: ${ROLE_LABELS[role]} (${role})\nPérimètre: ${scope.label}\nDate: ${new Date().toISOString().slice(0, 10)}\nModules: Dashboard, Membres, Collectes (Vague de Paix / Zaimu), Statistiques (selon rôle), Profil`,
    },
    {
      id: "kpis",
      title: "Indicateurs consolidés",
      body: `Membres: ${members.length} (actifs ${actifs})\nVague de Paix abonnés: ${vaguePaix}\nSokahan: ${sokahan}\nVP collectes: ${vp.length} · validé ${sum(vp, "Validé")} CDF · attente ${sum(vp, "En attente")} CDF\nZaimu ordinaire: ${zo.length} · validé ${sum(zo, "Validé")} CDF · attente ${sum(zo, "En attente")} CDF\nZaimu spécial: ${zs.length} · validé ${sum(zs, "Validé")} CDF · attente ${sum(zs, "En attente")} CDF\nKPIs dashboard:\n${dash.kpis.map((k) => `- ${k.label}: ${k.value} (${k.hint})`).join("\n")}`,
    },
    {
      id: "repartition",
      title: `Répartition par ${dash.unitPlural}`,
      body:
        dash.rows
          .slice(0, 12)
          .map(
            (r) =>
              `${r.label}: ${r.membres} membres (${r.actifs} actifs), VP ${r.vaguePaix}, Zaimu ${r.zaimu} CDF`
          )
          .join("\n") || "—",
    },
    {
      id: "categories",
      title: "Répartition membres (catégories / statuts / groupes)",
      body: `Catégories: ${countBy(members, "categorie")}\nStatuts: ${countBy(members, "statut")}\nGroupes: ${countBy(members, "groupe")}\nDistricts: ${countBy(members, "district")}`,
    },
    {
      id: "membres",
      title: "Liste membres du périmètre",
      body: memberLines || "aucun membre",
    },
    {
      id: "collectes",
      title: "Liste des collectes du périmètre",
      body: collecteLines || "aucune collecte",
    },
    {
      id: "alertes",
      title: "Points d’attention",
      body: `- ${attention}`,
    },
  ];

  const tokens = tokenize(question);
  const selected = (
    tokens.length
      ? chunks
          .map((c) => ({ c, s: score(c, tokens) }))
          .sort((a, b) => b.s - a.s)
          .filter((x) => x.s > 0)
          .map((x) => x.c)
      : chunks
  ).slice(0, 6);

  const picked = selected.length ? selected : chunks;
  // Always keep kpis + alertes
  for (const must of chunks.filter((c) => c.id === "kpis" || c.id === "alertes" || c.id === "perimetre")) {
    if (!picked.find((p) => p.id === must.id)) picked.unshift(must);
  }

  const dossier = picked
    .slice(0, 7)
    .map((c, i) => `[${i + 1}] ${c.title}\n${c.body}`)
    .join("\n\n");

  return `
=== DOSSIER OPÉRATIONNEL (périmètre ${ROLE_LABELS[role]}) ===
Question analysée: ${question || "(aperçu général)"}

${dossier}

=== CONSIGNES ===
- Réponds uniquement avec ces données.
- Donne des chiffres exacts et des formulations claires.
- Si tu parles d’un membre ou d’un paiement, utilise les lignes listées.
`.trim();
}
