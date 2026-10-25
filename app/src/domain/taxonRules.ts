import type { AnimodexType, Species } from './models';

/**
 * Règles de types et de capacités par taxon (classification de JEU, pas scientifique).
 * La règle la plus précise l'emporte : famille > ordre > classe > embranchement.
 * Chaque règle s'appuie sur le mode de vie typique du groupe (milieu, activité, adaptations).
 * Documentation : docs/GAME_RULES.md
 */
export interface TaxonRule {
  rank: 'family' | 'order' | 'class' | 'phylum';
  name: string;
  primary: AnimodexType;
  secondary?: AnimodexType;
  /** Capacités candidates, de la plus caractéristique à la moins caractéristique. */
  abilities: string[];
  /** Justification courte (affichée dans la fiche). */
  why: string;
}

const R = (rank: TaxonRule['rank'], names: string[], primary: AnimodexType, secondary: AnimodexType | undefined, abilities: string[], why: string): TaxonRule[] =>
  names.map((name) => ({ rank, name, primary, secondary, abilities, why }));

export const TAXON_RULES: TaxonRule[] = [
  // --- Oiseaux ---
  ...R('family', ['Ardeidae', 'Ciconiidae', 'Threskiornithidae'], 'water', 'air', ['patience-du-pecheur', 'plongeon'], 'échassiers qui chassent dans l’eau peu profonde'),
  ...R('family', ['Alcedinidae'], 'water', 'light', ['plongeon'], 'oiseaux colorés qui plongent pour pêcher'),
  ...R('family', ['Cathartidae'], 'air', 'fire', ['flair-lointain', 'vol-rapide'], 'vautours planeurs qui repèrent les charognes'),
  ...R('family', ['Trochilidae'], 'light', 'air', ['vol-stationnaire', 'parure-eclatante'], 'colibris aux reflets métalliques et au vol stationnaire'),
  ...R('family', ['Oriolidae', 'Icteridae'], 'light', 'air', ['parure-eclatante', 'chant-territorial'], 'passereaux aux couleurs vives'),
  ...R('family', ['Picidae'], 'plant', 'air', ['tambour'], 'pics qui vivent sur les troncs'),
  ...R('family', ['Corvidae'], 'shadow', 'air', ['opportuniste', 'flair-lointain'], 'oiseaux sombres et ingénieux'),
  ...R('order', ['Anseriformes', 'Podicipediformes', 'Gaviiformes', 'Suliformes', 'Phoenicopteriformes', 'Gruiformes'], 'water', 'air', ['grace-aquatique', 'plongeon'], 'oiseaux des plans d’eau'),
  ...R('order', ['Charadriiformes', 'Procellariiformes', 'Pelecaniformes'], 'water', 'air', ['plongeon', 'vol-rapide'], 'oiseaux de rivage et de mer'),
  ...R('order', ['Sphenisciformes'], 'ice', 'water', ['plongeon', 'fourrure-isolante'], 'manchots des mers froides'),
  ...R('order', ['Strigiformes', 'Caprimulgiformes'], 'shadow', 'air', ['vol-silencieux', 'vision-nocturne'], 'oiseaux de la nuit'),
  ...R('order', ['Accipitriformes', 'Falconiformes'], 'air', 'earth', ['vol-rapide', 'flair-lointain'], 'rapaces diurnes'),
  ...R('order', ['Psittaciformes', 'Coraciiformes', 'Bucerotiformes'], 'light', 'plant', ['parure-eclatante', 'chant-territorial'], 'oiseaux au plumage éclatant'),
  ...R('order', ['Galliformes'], 'earth', 'plant', ['camouflage', 'course-endurante'], 'oiseaux qui vivent surtout au sol'),
  ...R('order', ['Columbiformes'], 'air', 'earth', ['vol-rapide', 'opportuniste'], 'pigeons et tourterelles'),
  ...R('order', ['Passeriformes'], 'air', 'plant', ['chant-territorial', 'opportuniste'], 'passereaux des haies et des bois'),
  ...R('class', ['Aves'], 'air', undefined, ['vol-rapide'], 'oiseaux'),
  // --- Mammifères ---
  ...R('order', ['Chiroptera'], 'shadow', 'air', ['vision-nocturne', 'vol-silencieux'], 'chauves-souris nocturnes'),
  ...R('family', ['Delphinidae', 'Phocoenidae', 'Balaenopteridae', 'Balaenidae', 'Physeteridae', 'Monodontidae'], 'water', 'light', ['plongeon', 'grace-aquatique'], 'cétacés'),
  ...R('family', ['Phocidae', 'Otariidae', 'Odobenidae'], 'water', 'ice', ['plongeon', 'fourrure-isolante'], 'phoques et otaries'),
  ...R('family', ['Castoridae'], 'water', 'plant', ['reserve-cachee', 'plongeon'], 'castors bâtisseurs de barrages'),
  ...R('family', ['Sciuridae'], 'plant', 'earth', ['reserve-cachee', 'agilite'], 'écureuils et marmottes'),
  ...R('family', ['Felidae'], 'shadow', 'earth', ['pas-discret', 'vision-nocturne'], 'félins chasseurs à l’affût'),
  ...R('family', ['Canidae'], 'earth', 'shadow', ['course-endurante', 'pas-discret'], 'renards, loups et chacals'),
  ...R('family', ['Mustelidae'], 'earth', 'shadow', ['flair-lointain', 'pas-discret'], 'mustélidés agiles'),
  ...R('family', ['Ursidae'], 'earth', 'rock', ['flair-lointain', 'reserve-cachee'], 'ours'),
  ...R('family', ['Erinaceidae'], 'earth', 'rock', ['piquants'], 'hérissons couverts de piquants'),
  ...R('family', ['Atelidae', 'Cebidae', 'Cercopithecidae', 'Hylobatidae'], 'plant', 'light', ['queue-prehensile', 'agilite'], 'singes des arbres'),
  ...R('order', ['Primates'], 'plant', undefined, ['agilite'], 'primates'),
  ...R('order', ['Artiodactyla', 'Perissodactyla'], 'earth', 'plant', ['course-endurante', 'camouflage'], 'ongulés des prairies et des forêts'),
  ...R('order', ['Lagomorpha'], 'earth', 'plant', ['course-endurante', 'camouflage'], 'lièvres et lapins'),
  ...R('order', ['Rodentia'], 'earth', 'shadow', ['reserve-cachee', 'agilite'], 'rongeurs'),
  ...R('order', ['Eulipotyphla', 'Didelphimorphia'], 'earth', 'shadow', ['pas-discret', 'flair-lointain'], 'petits mammifères nocturnes'),
  ...R('class', ['Mammalia'], 'earth', undefined, ['course-endurante'], 'mammifères'),
  // --- Reptiles ---
  ...R('order', ['Testudines'], 'rock', 'water', ['carapace'], 'tortues à carapace'),
  ...R('order', ['Crocodylia'], 'water', 'rock', ['patience-du-pecheur', 'carapace'], 'crocodiliens'),
  ...R('family', ['Iguanidae', 'Agamidae'], 'plant', 'fire', ['bain-de-soleil', 'autotomie'], 'grands lézards qui se chauffent au soleil'),
  ...R('family', ['Chamaeleonidae'], 'plant', 'light', ['camouflage', 'parure-eclatante'], 'caméléons changeant de couleur'),
  ...R('family', ['Lacertidae', 'Teiidae', 'Scincidae', 'Phrynosomatidae'], 'fire', 'rock', ['bain-de-soleil', 'autotomie'], 'lézards des milieux ensoleillés'),
  ...R('family', ['Viperidae', 'Elapidae'], 'fire', 'shadow', ['pas-discret', 'camouflage'], 'serpents venimeux'),
  ...R('family', ['Colubridae', 'Natricidae', 'Boidae', 'Pythonidae', 'Lamprophiidae'], 'earth', 'shadow', ['pas-discret', 'camouflage'], 'serpents'),
  ...R('class', ['Reptilia'], 'fire', 'earth', ['bain-de-soleil'], 'reptiles'),
  // --- Amphibiens ---
  ...R('order', ['Caudata', 'Urodela'], 'water', 'shadow', ['regeneration', 'coloration-avertissement'], 'salamandres et tritons'),
  ...R('order', ['Anura'], 'water', 'earth', ['bond'], 'grenouilles et crapauds'),
  ...R('class', ['Amphibia'], 'water', undefined, ['regeneration'], 'amphibiens'),
  // --- Poissons ---
  ...R('family', ['Salmonidae'], 'water', 'ice', ['remonte-courant'], 'truites et saumons des eaux froides'),
  ...R('class', ['Elasmobranchii', 'Chondrichthyes'], 'water', 'shadow', ['pas-discret', 'plongeon'], 'requins et raies'),
  ...R('class', ['Actinopterygii'], 'water', undefined, ['remonte-courant'], 'poissons'),
  // --- Insectes ---
  ...R('order', ['Odonata', 'Ephemeroptera', 'Trichoptera', 'Plecoptera'], 'insect', 'water', ['vol-stationnaire', 'metamorphose'], 'insectes dont les larves vivent dans l’eau'),
  ...R('order', ['Lepidoptera'], 'insect', 'light', ['metamorphose', 'parure-eclatante'], 'papillons'),
  ...R('family', ['Coccinellidae'], 'insect', 'light', ['coloration-avertissement', 'metamorphose'], 'coccinelles'),
  ...R('order', ['Hymenoptera'], 'insect', 'plant', ['travail-collectif', 'coloration-avertissement'], 'abeilles, guêpes et fourmis'),
  ...R('order', ['Coleoptera'], 'insect', 'rock', ['carapace', 'metamorphose'], 'coléoptères à élytres'),
  ...R('order', ['Orthoptera'], 'insect', 'earth', ['bond', 'camouflage'], 'criquets et sauterelles'),
  ...R('class', ['Insecta'], 'insect', undefined, ['metamorphose'], 'insectes'),
  // --- Autres invertébrés ---
  ...R('class', ['Arachnida'], 'shadow', 'earth', ['pas-discret', 'camouflage'], 'araignées et scorpions'),
  ...R('class', ['Gastropoda'], 'earth', 'rock', ['carapace'], 'escargots et limaces'),
  ...R('class', ['Bivalvia', 'Malacostraca'], 'water', 'rock', ['carapace'], 'crustacés et coquillages'),
  ...R('class', ['Cephalopoda'], 'water', 'shadow', ['camouflage', 'regeneration'], 'pieuvres et seiches'),
  ...R('phylum', ['Cnidaria'], 'water', 'light', ['coloration-avertissement'], 'méduses et coraux'),
  ...R('phylum', ['Echinodermata'], 'water', 'rock', ['regeneration', 'carapace'], 'étoiles et oursins de mer'),
];

/** Règle de dernier recours si aucun taxon connu ne correspond. */
export const FALLBACK_RULE: TaxonRule = { rank: 'phylum', name: '*', primary: 'earth', abilities: ['course-endurante'], why: 'animal sans règle plus précise' };

const RANK_ORDER: TaxonRule['rank'][] = ['family', 'order', 'class', 'phylum'];

export function findTaxonRule(species: Pick<Species, 'taxonomy'>): TaxonRule {
  for (const rank of RANK_ORDER) {
    const name = species.taxonomy[rank];
    if (!name) continue;
    const rule = TAXON_RULES.find((r) => r.rank === rank && r.name === name);
    if (rule) return rule;
  }
  return FALLBACK_RULE;
}
