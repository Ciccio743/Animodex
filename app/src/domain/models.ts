/** Modèles du domaine Animodex. Les champs naturalistes inconnus restent absents (undefined). */

import type { CardFinish } from './finishes';

export const ANIMODEX_TYPES = [
  'insect',
  'water',
  'plant',
  'air',
  'shadow',
  'fire',
  'rock',
  'ice',
  'light',
  'earth',
] as const;
/** L'ordre de ANIMODEX_TYPES sert aussi de départage déterministe entre types à égalité. */
export type AnimodexType = (typeof ANIMODEX_TYPES)[number];

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export const TAXON_GROUPS = [
  'bird',
  'mammal',
  'reptile',
  'amphibian',
  'fish',
  'insect',
  'other_invertebrate',
] as const;
export type TaxonGroup = (typeof TAXON_GROUPS)[number];

export const HABITATS = [
  'wetland',
  'freshwater',
  'marine',
  'coast',
  'forest',
  'woodland_edge',
  'tropical_forest',
  'grassland',
  'farmland',
  'garden',
  'urban',
  'mountain',
  'alpine',
  'rocky',
  'arid',
  'cave',
] as const;
export type HabitatCode = (typeof HABITATS)[number];

export type Activity = 'diurnal' | 'nocturnal' | 'crepuscular' | 'cathemeral';

export interface SourceReference {
  label: string;
  url: string;
  /** Champs couverts par cette source. */
  fields?: string[];
  accessedAt?: string;
}

export type ConservationCategory = 'EX' | 'EW' | 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE';

export interface ConservationStatus {
  /** Code tel que fourni par la source (ex. « LC », ou un code national). */
  code: string;
  /** Catégorie UICN normalisée, uniquement si la source la fournit. */
  category?: ConservationCategory;
  authority?: string;
  /** Absent = statut mondial. */
  placeName?: string;
  sourceUrl: string;
}

export interface Measurement {
  value: string;
  context?: string;
}

export interface SpeciesMedia {
  id: string;
  speciesId: string;
  url: string;
  thumbnailUrl?: string;
  creator?: string;
  license: string;
  attribution: string;
  source: string;
  sourceUrl?: string;
  mediaType: 'photo';
  verificationStatus: 'source_license';
}

export interface TaxonomyPath {
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
}

/**
 * Espèce du catalogue local. Le catalogue démarre VIDE : une espèce y entre quand elle est consultée,
 * téléchargée dans un pack de zone ou observée. Toutes les données viennent de sources externes
 * (iNaturalist, GBIF) et gardent leur provenance. Les champs inconnus restent absents.
 */
export interface Species {
  id: string;
  /** Numéro de carte stable dérivé de l'identifiant iNaturalist : AX-<taxonId>. */
  cardNumber: string;
  legacyCardNumbers?: string[];
  inatTaxonId: number;
  gbifUsageKey?: number;
  scientificName: string;
  rank: string;
  frenchName?: string;
  commonNames: string[];
  group: TaxonGroup;
  taxonomy: TaxonomyPath;
  description?: { text: string; source: string; url?: string; license: string };
  physicalCharacteristics?: { length?: Measurement; wingspan?: Measurement; mass?: Measurement };
  longevity?: Measurement;
  diet?: string;
  habitats: HabitatCode[];
  habitatText?: string;
  distribution?: string;
  behavior?: string;
  reproduction?: string;
  activity?: Activity;
  seasonality?: string;
  adaptations: string[];
  threats?: string;
  conservationStatus?: ConservationStatus;
  /** Nombre d'observations sur iNaturalist (monde) au moment de la récupération. */
  observationsCount?: number;
  media: SpeciesMedia[];
  /** Espèce sensible (menacée) : la localisation précise n'est jamais affichée. */
  sensitive: boolean;
  sourceReferences: SourceReference[];
  fetchedAt: string;
  lastVerifiedAt?: string;
}

export function displayName(s: Pick<Species, 'frenchName' | 'scientificName'>): string {
  return s.frenchName ?? s.scientificName;
}

export type AbilityEffectType = 'damage' | 'defense' | 'evade' | 'heal' | 'speed' | 'reveal' | 'boost';

export interface Ability {
  id: string;
  name: string;
  description: string;
  /** Adaptation réelle dont la capacité s'inspire. */
  inspiration: string;
  associatedTypes: AnimodexType[];
  effectType: AbilityEffectType;
  effectText: string;
  effectParameters: Record<string, number>;
  balanceRule: string;
}

export interface AnimodexCard {
  id: string;
  speciesId: string;
  cardNumber: string;
  primaryType: AnimodexType;
  secondaryType?: AnimodexType;
  rarity: Rarity;
  baseHp: number;
  abilityId: string;
  visualVariant: string;
  /** Finition affichée (la plus rare trouvée). Absente sur les cartes créées avant les finitions : « nature ». */
  finish?: CardFinish;
  /** Toutes les finitions déjà tirées pour cette espèce. */
  finishesFound?: CardFinish[];
  rulesVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type IdentificationStatus = 'confirmed' | 'uncertain' | 'to_identify';
export type LocationPrecision = 'exact' | 'approximate' | 'none';

export interface Observation {
  id: string;
  speciesId?: string;
  observedAt: string;
  latitude?: number;
  longitude?: number;
  locationPrecision: LocationPrecision;
  locationLabel?: string;
  photoIds: string[];
  identificationStatus: IdentificationStatus;
  identificationConfidence?: number;
  identificationSource: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  observationId: string;
  blob: Blob;
  thumbBlob: Blob;
  mimeType: string;
  width: number;
  height: number;
  source: 'camera' | 'import';
  createdAt: string;
}

export interface Settings {
  id: 'settings';
  locationPermission: 'unknown' | 'granted' | 'denied';
  defaultLocationPrecision: LocationPrecision;
  /** Suivre la position du téléphone sur la carte et la placer d'office dans une nouvelle observation. */
  autoLocate: boolean;
  units: 'metric' | 'imperial';
  language: 'fr';
  reducedMotion: 'system' | 'reduce' | 'full';
  textScale: 'normal' | 'large';
  dataStorageMode: 'local';
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  locationPermission: 'unknown',
  defaultLocationPrecision: 'exact',
  autoLocate: true,
  units: 'metric',
  language: 'fr',
  reducedMotion: 'system',
  textScale: 'normal',
  dataStorageMode: 'local',
};
