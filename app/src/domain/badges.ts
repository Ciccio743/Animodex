import type { Species } from './models';
import { assignTypes } from './typing';

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  progress: number;
  goal: number;
}

/** Badges dérivés de la collection : aucun badge ne dépend de données absentes du catalogue. */
export function computeBadges(discovered: ReadonlySet<string>, catalog: readonly Species[]): Badge[] {
  const found = catalog.filter((s) => discovered.has(s.id));
  const count = (pred: (s: Species) => boolean) => found.filter(pred).length;
  const groups = new Set(found.map((s) => s.group)).size;
  const defs: Omit<Badge, 'unlocked'>[] = [
    { id: 'first', name: 'Premier pas', description: 'Confirmer une première espèce', progress: found.length, goal: 1 },
    { id: 'five', name: 'Naturaliste en herbe', description: 'Découvrir 5 espèces', progress: found.length, goal: 5 },
    { id: 'birds3', name: 'Œil de faucon', description: 'Découvrir 3 oiseaux', progress: count((s) => s.group === 'bird'), goal: 3 },
    {
      id: 'wet3',
      name: 'Pieds mouillés',
      description: 'Découvrir 3 espèces de type Eau',
      progress: count((s) => assignTypes(s).primary === 'water'),
      goal: 3,
    },
    { id: 'groups4', name: 'Arbre du vivant', description: 'Découvrir 4 groupes différents', progress: groups, goal: 4 },
  ];
  return defs.map((d) => ({ ...d, progress: Math.min(d.progress, d.goal), unlocked: d.progress >= d.goal }));
}
