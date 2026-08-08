import { COLLECTES_SEED } from "../app/CollectesModule";
import { buildDashboardScope } from "../app/dashboardStats";
import { MEMBERS_SEED, memberFullName } from "../app/membersData";
import {
  DEMO_ORG_SCOPE,
  filterMembersByScope,
  type CollecteLike,
} from "../app/memberListStats";
import { ROLE_LABELS, type PlatformRole } from "../app/roles";

function filterCollectesByScope(role: PlatformRole): CollecteLike[] {
  const scope = DEMO_ORG_SCOPE[role];
  return COLLECTES_SEED.filter((c) => {
    if (scope.chapitre && c.chapitre !== scope.chapitre) return false;
    if (scope.district && c.district !== scope.district) return false;
    if (scope.groupe && c.groupe !== scope.groupe) return false;
    return true;
  });
}

export function buildDashboardContext(role: PlatformRole): string {
  const scope = DEMO_ORG_SCOPE[role];
  const members = filterMembersByScope(MEMBERS_SEED, scope);
  const dash = buildDashboardScope(role, members);
  const collectes = filterCollectesByScope(role);

  const byType = (type: CollecteLike["type"]) => collectes.filter((c) => c.type === type);
  const sum = (list: CollecteLike[], statut?: string) =>
    list
      .filter((c) => (statut ? c.statut === statut : true))
      .reduce((acc, c) => acc + c.montant, 0);

  const vp = byType("vague-paix");
  const zo = byType("zaimu-ordinaire");
  const zs = byType("zaimu-special");

  const actifs = members.filter((m) => m.statut === "Actif").length;
  const vaguePaix = members.filter((m) => m.abonnementVaguePaix).length;
  const sampleNames = members.slice(0, 8).map((m) => memberFullName(m)).join(", ");

  const unitLines = dash.rows
    .slice(0, 8)
    .map(
      (r) =>
        `- ${r.label}: ${r.membres} membres (${r.actifs} actifs), VP ${r.vaguePaix}, Zaimu ${r.zaimu} CDF`
    )
    .join("\n");

  return `
Contexte dashboard — rôle ${ROLE_LABELS[role]} (${role})
Périmètre: ${scope.label}
Date du jour: ${new Date().toISOString().slice(0, 10)}

Indicateurs consolidés:
- Membres dans le périmètre: ${members.length} (actifs: ${actifs})
- Abonnés Vague de Paix: ${vaguePaix}
- Collectes Vague de Paix: ${vp.length} lignes, validé ${sum(vp, "Validé")} CDF, en attente ${sum(vp, "En attente")} CDF
- Zaimu ordinaire: ${zo.length} lignes, validé ${sum(zo, "Validé")} CDF, en attente ${sum(zo, "En attente")} CDF
- Zaimu spéciaux: ${zs.length} lignes, validé ${sum(zs, "Validé")} CDF, en attente ${sum(zs, "En attente")} CDF

KPIs tableau de bord:
${dash.kpis.map((k) => `- ${k.label}: ${k.value} (${k.hint})`).join("\n")}

Répartition (${dash.unitPlural}):
${unitLines || "—"}

Exemples de membres du périmètre: ${sampleNames || "aucun"}

Modules utiles: Dashboard, Membres, Collectes (Vague de Paix / Zaimu), Statistiques (selon rôle), Profil.
`.trim();
}
