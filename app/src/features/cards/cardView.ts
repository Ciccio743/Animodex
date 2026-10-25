import type { Ability, AnimodexCard, Observation, Species } from '../../domain/models';
import { generateCard } from '../../domain/cards';
import { ABILITY_MAP } from '../../data/abilities';
import { formatShortDate } from '../../utils/format';

export interface CardView {
  species: Species;
  card: AnimodexCard;
  ability: Ability;
  /** Débloquée = au moins une observation confirmée. Sinon simple aperçu. */
  unlocked: boolean;
  firstObservation?: Observation;
  lastObservation?: Observation;
  observationCount: number;
}

/** Assemble l'affichage d'une carte : la carte enregistrée si elle existe, sinon un aperçu calculé (non stocké). */
export function buildCardView(
  species: Species,
  stored: AnimodexCard | undefined,
  progress: {
    discoveredSpeciesIds: ReadonlySet<string>;
    firstObservationBySpecies: ReadonlyMap<string, Observation>;
    lastObservationBySpecies: ReadonlyMap<string, Observation>;
    observationCountBySpecies: ReadonlyMap<string, number>;
  },
): CardView {
  const card = stored ?? generateCard(species, ABILITY_MAP, new Date(0));
  return {
    species,
    card,
    ability: ABILITY_MAP.get(card.abilityId)!,
    unlocked: progress.discoveredSpeciesIds.has(species.id) && !!stored,
    firstObservation: progress.firstObservationBySpecies.get(species.id),
    lastObservation: progress.lastObservationBySpecies.get(species.id),
    observationCount: progress.observationCountBySpecies.get(species.id) ?? 0,
  };
}

/**
 * Ligne de lieu de la carte : uniquement issue d'une observation réelle.
 * Avec plusieurs observations, on parle de « première découverte » et non d'un lieu unique.
 */
export function discoveryLine(view: CardView): string | undefined {
  const o = view.firstObservation;
  if (!view.unlocked || !o) return undefined;
  const date = formatShortDate(o.observedAt);
  const place = view.species.sensitive ? 'lieu masqué (espèce sensible)' : o.locationLabel;
  return `Première découverte : ${place ? `${place}, ` : ''}${date}`;
}
