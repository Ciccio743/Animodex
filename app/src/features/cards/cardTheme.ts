import type { CSSProperties } from 'react';
import { Building, Droplets, Flower2, Mountain, Sun, Trees, type LucideIcon } from 'lucide-react';
import type { HabitatCode, TaxonGroup } from '../../domain/models';

/** Couleurs des pastilles de groupe, les mêmes que sur le dos de carte. */
export const GROUP_COLORS: Record<TaxonGroup, { light: string; dark: string }> = {
  mammal: { light: '#ffbd8a', dark: '#d4461a' },
  bird: { light: '#c9b0ff', dark: '#6a38d6' },
  fish: { light: '#8fd3ff', dark: '#1f6fd1' },
  insect: { light: '#e3ff8a', dark: '#5f9a12' },
  reptile: { light: '#fff09a', dark: '#c98a0c' },
  amphibian: { light: '#8ff09a', dark: '#1f9a45' },
  other_invertebrate: { light: '#ffb0e0', dark: '#c52f8c' },
};

export function groupStyle(group: TaxonGroup): CSSProperties {
  const c = GROUP_COLORS[group];
  return { '--g-light': c.light, '--g-dark': c.dark } as CSSProperties;
}

type Land = [string, string];
const WATER: Land = ['#5cc8f0', '#3aa6e0'];
const FOREST: Land = ['#6fcf5e', '#4fb84a'];
const MEADOW: Land = ['#a8e06a', '#86c94a'];
const MOUNTAIN: Land = ['#b7a6d9', '#9583c4'];
const SAND: Land = ['#f2cf7a', '#e0b257'];
const CITY: Land = ['#c9d4de', '#aebccb'];

const LAND_BY_HABITAT: Record<HabitatCode, Land> = {
  wetland: WATER,
  freshwater: WATER,
  marine: WATER,
  coast: WATER,
  forest: FOREST,
  woodland_edge: FOREST,
  tropical_forest: FOREST,
  garden: FOREST,
  grassland: MEADOW,
  farmland: MEADOW,
  mountain: MOUNTAIN,
  alpine: MOUNTAIN,
  rocky: MOUNTAIN,
  cave: MOUNTAIN,
  arid: SAND,
  urban: CITY,
};

/** Couleur des collines du paysage, d'après le premier habitat connu. */
export function landStyle(habitats: readonly HabitatCode[]): CSSProperties {
  const land = habitats.length ? LAND_BY_HABITAT[habitats[0]] : undefined;
  return land ? ({ '--land-a': land[0], '--land-b': land[1] } as CSSProperties) : {};
}

export const GROUP_SINGULAR: Record<TaxonGroup, string> = {
  mammal: 'Mammifère',
  bird: 'Oiseau',
  fish: 'Poisson',
  insect: 'Insecte',
  reptile: 'Reptile',
  amphibian: 'Amphibien',
  other_invertebrate: 'Invertébré',
};

const HABITAT_ICON_BY_LAND = new Map<Land, LucideIcon>([
  [WATER, Droplets],
  [FOREST, Trees],
  [MEADOW, Flower2],
  [MOUNTAIN, Mountain],
  [SAND, Sun],
  [CITY, Building],
]);

/** Icône de la pastille d'habitat. */
export function habitatIcon(habitat: HabitatCode): LucideIcon {
  return HABITAT_ICON_BY_LAND.get(LAND_BY_HABITAT[habitat]) ?? Trees;
}
