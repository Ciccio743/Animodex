import type { Ability, AnimodexCard, AnimodexType, Rarity, Species } from './models';
import { GAME_RULES_VERSION } from './gameConfig';
import { assignTypes } from './typing';
import { assignRarity, computeHp } from './rarity';
import { selectAbility } from './abilities';
import { DEFAULT_FINISH, finishRank, type CardFinish } from './finishes';

export interface CardStats {
  primaryType: AnimodexType;
  secondaryType?: AnimodexType;
  rarity: Rarity;
  baseHp: number;
  ability: Ability;
}

/** Statistiques de jeu d'une espèce, entièrement déterministes. */
export function computeCardStats(species: Species, abilities: ReadonlyMap<string, Ability>): CardStats {
  const { primary, secondary } = assignTypes(species);
  const rarity = assignRarity(species);
  return {
    primaryType: primary,
    secondaryType: secondary,
    rarity,
    baseHp: computeHp(rarity, species.inatTaxonId),
    ability: selectAbility(species, primary, abilities),
  };
}

export function cardIdFor(speciesId: string): string {
  return `card-${speciesId}`;
}

/** Crée la carte d'une espèce. Le numéro vient du catalogue, jamais d'un ordre d'affichage. */
export function generateCard(
  species: Species,
  abilities: ReadonlyMap<string, Ability>,
  now: Date = new Date(),
  finish: CardFinish = DEFAULT_FINISH,
): AnimodexCard {
  const stats = computeCardStats(species, abilities);
  const ts = now.toISOString();
  return {
    id: cardIdFor(species.id),
    speciesId: species.id,
    cardNumber: species.cardNumber,
    primaryType: stats.primaryType,
    secondaryType: stats.secondaryType,
    rarity: stats.rarity,
    baseHp: stats.baseHp,
    abilityId: stats.ability.id,
    visualVariant: `${stats.primaryType}-${stats.rarity}`,
    finish,
    finishesFound: [finish],
    rulesVersion: GAME_RULES_VERSION,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function cardFinish(card: AnimodexCard): CardFinish {
  return card.finish ?? DEFAULT_FINISH;
}

/** Finitions trouvées pour une carte, de la plus rare à la plus courante : une carte de collection chacune. */
export function cardVersions(card: AnimodexCard): CardFinish[] {
  const found = card.finishesFound ?? [cardFinish(card)];
  return [...new Set(found)].sort((a, b) => finishRank(b) - finishRank(a));
}

/**
 * Applique une finition tirée à une carte existante : elle rejoint les finitions trouvées et
 * remplace la finition affichée si elle est plus rare.
 */
export function applyFinishDraw(
  card: AnimodexCard,
  drawn: CardFinish,
  now: Date = new Date(),
): { card: AnimodexCard; upgraded: boolean; firstTime: boolean } {
  const current = cardFinish(card);
  const found = card.finishesFound ?? [current];
  const firstTime = !found.includes(drawn);
  const upgraded = finishRank(drawn) > finishRank(current);
  if (!firstTime && !upgraded && card.finish) return { card, upgraded: false, firstTime: false };
  return {
    card: {
      ...card,
      finish: upgraded ? drawn : current,
      finishesFound: firstTime ? [...found, drawn] : found,
      updatedAt: now.toISOString(),
    },
    upgraded,
    firstTime,
  };
}

/** Renvoie la carte existante si l'espèce en possède déjà une ; sinon en crée une. */
export function ensureCard(
  species: Species,
  existing: AnimodexCard | undefined,
  abilities: ReadonlyMap<string, Ability>,
  now?: Date,
): { card: AnimodexCard; created: boolean } {
  if (existing) return { card: existing, created: false };
  return { card: generateCard(species, abilities, now), created: true };
}
