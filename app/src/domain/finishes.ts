/**
 * Finitions de carte (« sortes de cartes ») : purement décoratives, tirées au sort à chaque nouvelle
 * observation confirmée. Indépendantes de la rareté de l'espèce (empreintes). Documentation : docs/GAME_RULES.md
 */
export const CARD_FINISHES = [
  'nature',
  'aquarelle',
  'rosee',
  'crepuscule',
  'givre',
  'aurore',
  'lucioles',
  'vitrail',
  'nuit',
  'soleil',
  'prisme',
] as const;
/** L'ordre de CARD_FINISHES va de la plus courante à la plus rare. */
export type CardFinish = (typeof CARD_FINISHES)[number];

export const DEFAULT_FINISH: CardFinish = 'nature';

/** Chance de tirage de chaque finition, en pourcentage (total : 100). */
export const FINISH_WEIGHTS: Record<CardFinish, number> = {
  nature: 40,
  aquarelle: 18,
  rosee: 12,
  crepuscule: 9,
  givre: 7,
  aurore: 5,
  lucioles: 4,
  vitrail: 2.5,
  nuit: 1.5,
  soleil: 0.8,
  prisme: 0.2,
};

export const FINISH_LABELS: Record<CardFinish, string> = {
  nature: 'Nature',
  aquarelle: 'Aquarelle',
  rosee: 'Rosée',
  crepuscule: 'Crépuscule',
  givre: 'Givre',
  aurore: 'Aurore',
  lucioles: 'Lucioles',
  vitrail: 'Vitrail',
  nuit: 'Nuit étoilée',
  soleil: 'Soleil d’or',
  prisme: 'Prisme',
};

/** Tire une finition selon FINISH_WEIGHTS. `random` renvoie un nombre dans [0, 1[. */
export function drawFinish(random: () => number = Math.random): CardFinish {
  const total = CARD_FINISHES.reduce((s, f) => s + FINISH_WEIGHTS[f], 0);
  let r = random() * total;
  for (const f of CARD_FINISHES) {
    r -= FINISH_WEIGHTS[f];
    if (r < 0) return f;
  }
  return DEFAULT_FINISH;
}

export function finishRank(f: CardFinish): number {
  return CARD_FINISHES.indexOf(f);
}

/** « 40 % » ou, pour les plus rares, « 1 sur 500 ». */
export function formatFinishChance(f: CardFinish): string {
  const w = FINISH_WEIGHTS[f];
  if (w >= 10) return `${w.toLocaleString('fr-FR')} %`;
  return `1 sur ${Math.round(100 / w)}`;
}
