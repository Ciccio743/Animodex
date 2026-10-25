import type { Ability, AnimodexCard, AnimodexType, Rarity, Species } from './models';
import { GAME_RULES_VERSION } from './gameConfig';
import { assignTypes } from './typing';
import { assignRarity, computeHp } from './rarity';
import { selectAbility } from './abilities';

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
export function generateCard(species: Species, abilities: ReadonlyMap<string, Ability>, now: Date = new Date()): AnimodexCard {
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
    rulesVersion: GAME_RULES_VERSION,
    createdAt: ts,
    updatedAt: ts,
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
