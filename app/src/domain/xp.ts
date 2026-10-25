import { displayName, type Observation, type Species } from './models';
import { isDiscovery } from './progress';

/**
 * XP dérivée des observations (jamais stockée) : elle ne peut pas être gonflée en
 * réenregistrant la même rencontre. Règles : docs/GAME_RULES.md § XP.
 */
export const XP_RULES = {
  newSpecies: 100,
  newGroup: 50,
  newOrder: 30,
  newFamily: 20,
  repeatSighting: 10,
} as const;

export type XpReason = keyof typeof XP_RULES;

export interface XpEvent {
  observationId: string;
  reason: XpReason;
  amount: number;
  detail: string;
}

export function computeXpEvents(observations: readonly Observation[], catalog: readonly Species[]): XpEvent[] {
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const species = new Set<string>();
  const groups = new Set<string>();
  const orders = new Set<string>();
  const families = new Set<string>();
  const repeatDays = new Set<string>();
  const events: XpEvent[] = [];
  const sorted = [...observations]
    .filter(isDiscovery)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.createdAt.localeCompare(b.createdAt));

  for (const o of sorted) {
    const sp = byId.get(o.speciesId);
    if (!sp) continue;
    const push = (reason: XpReason, detail: string) =>
      events.push({ observationId: o.id, reason, amount: XP_RULES[reason], detail });

    if (!species.has(sp.id)) {
      species.add(sp.id);
      push('newSpecies', displayName(sp));
      if (!groups.has(sp.group)) {
        groups.add(sp.group);
        push('newGroup', sp.group);
      }
      const { order, family } = sp.taxonomy;
      if (order && !orders.has(order)) {
        orders.add(order);
        push('newOrder', order);
      }
      if (family && !families.has(family)) {
        families.add(family);
        push('newFamily', family);
      }
    } else {
      // Une seule récompense de revoyure par espèce et par jour.
      const key = `${sp.id}@${o.observedAt.slice(0, 10)}`;
      if (!repeatDays.has(key)) {
        repeatDays.add(key);
        push('repeatSighting', displayName(sp));
      }
    }
  }
  return events;
}

/** XP cumulée requise pour atteindre un niveau : 0, 100, 300, 600, 1000… */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFromXp(xp: number): { level: number; current: number; next: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return { level, current: xpForLevel(level), next: xpForLevel(level + 1) };
}

export function totalXp(events: readonly XpEvent[]): number {
  return events.reduce((sum, e) => sum + e.amount, 0);
}
