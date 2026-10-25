import type {
  Activity,
  AnimodexType,
  ConservationCategory,
  HabitatCode,
  IdentificationStatus,
  LocationPrecision,
  Rarity,
  TaxonGroup,
} from './models';

export const TYPE_LABELS: Record<AnimodexType, string> = {
  water: 'Eau',
  air: 'Air',
  earth: 'Terre',
  fire: 'Feu',
  plant: 'Végétation',
  ice: 'Glace',
  rock: 'Roche',
  shadow: 'Ombre',
  light: 'Lumière',
  insect: 'Insecte',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

export const RARITY_STARS: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };

export const GROUP_LABELS: Record<TaxonGroup, string> = {
  bird: 'Oiseaux',
  mammal: 'Mammifères',
  reptile: 'Reptiles',
  amphibian: 'Amphibiens',
  fish: 'Poissons',
  insect: 'Insectes',
  other_invertebrate: 'Autres invertébrés',
};

export const HABITAT_LABELS: Record<HabitatCode, string> = {
  wetland: 'Zones humides',
  freshwater: 'Eaux douces',
  marine: 'Mer',
  coast: 'Littoral',
  forest: 'Forêts',
  woodland_edge: 'Lisières et haies',
  tropical_forest: 'Forêts tropicales',
  grassland: 'Prairies',
  farmland: 'Champs et bocages',
  garden: 'Jardins et parcs',
  urban: 'Villes',
  mountain: 'Montagne',
  alpine: 'Haute montagne',
  rocky: 'Milieux rocheux',
  arid: 'Milieux secs',
  cave: 'Grottes',
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  diurnal: 'Diurne (actif le jour)',
  nocturnal: 'Nocturne (actif la nuit)',
  crepuscular: 'Crépusculaire (aube et soir)',
  cathemeral: 'Actif de jour comme de nuit',
};

export const STATUS_LABELS: Record<IdentificationStatus, string> = {
  confirmed: 'Identification confirmée',
  uncertain: 'Identification incertaine',
  to_identify: 'À identifier',
};

export const PRECISION_LABELS: Record<LocationPrecision, string> = {
  exact: 'Position exacte (privée)',
  approximate: 'Position approximative',
  none: 'Sans coordonnées',
};

export const CONSERVATION_LABELS: Record<ConservationCategory, string> = {
  EX: 'Éteint',
  EW: "Éteint à l'état sauvage",
  CR: 'En danger critique',
  EN: 'En danger',
  VU: 'Vulnérable',
  NT: 'Quasi menacé',
  LC: 'Préoccupation mineure',
  DD: 'Données insuffisantes',
  NE: 'Non évalué',
};
