import type { CollecteRecord, CollecteTab } from "./CollectesModule";
import type { OrgScope } from "./memberListStats";
import { filterCollectesByScope } from "./memberListStats";
import type { PlatformRole } from "./roles";

export type CollecteNavFocus = {
  tab: CollecteTab;
  statut: "En attente" | "Validé" | "Annulé";
  /** Force la réapplication du focus même si onglet/statut sont identiques. */
  nonce?: number;
};

export type PendingPaymentNotification = {
  id: string;
  title: string;
  body: string;
  tab: CollecteTab;
  date: string;
  montant: number;
};

const TYPE_LABEL: Record<CollecteTab, string> = {
  "vague-paix": "Vague de Paix",
  "zaimu-ordinaire": "Zaimu ordinaire",
  "zaimu-special": "Zaimu spécial",
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

/** Rôles hiérarchiques qui doivent être alertés pour valider / suivre les paiements. */
export function canReceivePendingPaymentNotifications(role: PlatformRole): boolean {
  return role === "admin" || role === "centre" || role === "chapitre" || role === "district";
}

export function buildPendingPaymentNotifications(
  collectes: CollecteRecord[],
  role: PlatformRole,
  orgScope: OrgScope,
): PendingPaymentNotification[] {
  if (!canReceivePendingPaymentNotifications(role)) return [];

  const pending = filterCollectesByScope(collectes, orgScope)
    .filter((item) => item.statut === "En attente")
    .sort((a, b) => b.date.localeCompare(a.date));

  return pending.map((item) => ({
    id: item.id,
    title: `Paiement ${TYPE_LABEL[item.type]} en attente`,
    body: `${item.membre} · ${fmt(item.montant)} FCFA${item.groupe ? ` · ${item.groupe}` : ""}`,
    tab: item.type,
    date: item.date,
    montant: item.montant,
  }));
}

const READ_STORAGE_KEY = "sgi-pending-collecte-notifs-read";

export function loadReadNotificationIds(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markNotificationsRead(ids: string[]) {
  try {
    const current = loadReadNotificationIds();
    for (const id of ids) current.add(id);
    window.sessionStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...current]));
  } catch {
    // ignore storage errors
  }
}
