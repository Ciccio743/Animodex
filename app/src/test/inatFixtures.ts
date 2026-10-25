import type { InatTaxon } from '../services/sources/inatSchemas';
import { speciesFromInat } from '../services/sources/inatMapping';
import type { Species } from '../domain/models';

/**
 * FIXTURES DE TEST écrites à la main d'après la documentation de l'API iNaturalist v1.
 * Ce ne sont PAS des réponses réelles : identifiants, comptes et attributions sont fictifs.
 */
const AVES = [
  { id: 1, name: 'Animalia', rank: 'kingdom' },
  { id: 2, name: 'Chordata', rank: 'phylum' },
  { id: 3, name: 'Aves', rank: 'class' },
];

export function inatTaxon(over: Partial<InatTaxon> & { id: number; name: string }): InatTaxon {
  return {
    rank: 'species',
    iconic_taxon_name: 'Aves',
    observations_count: 120_000,
    threatened: false,
    ancestors: AVES,
    taxon_photos: [],
    ...over,
  } as InatTaxon;
}

const photo = (id: number, license: string | null = 'cc-by-nc') => ({
  id,
  license_code: license ?? undefined, // null dans l'API = tous droits réservés
  attribution: `(c) Photographe Test ${id}, some rights reserved (${license?.toUpperCase() ?? 'tous droits réservés'})`,
  url: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/square.jpg`,
});

export const HERON = inatTaxon({
  id: 900001,
  name: 'Ardea cinerea',
  preferred_common_name: 'Héron cendré',
  english_common_name: 'Grey Heron',
  observations_count: 150_000,
  ancestors: [...AVES, { id: 10, name: 'Pelecaniformes', rank: 'order' }, { id: 11, name: 'Ardeidae', rank: 'family' }, { id: 12, name: 'Ardea', rank: 'genus' }],
  default_photo: photo(501),
  taxon_photos: [{ photo: photo(501) }, { photo: photo(502, null) }, { photo: photo(503, 'cc-by') }],
  wikipedia_url: 'https://fr.wikipedia.org/wiki/H%C3%A9ron_cendr%C3%A9',
  wikipedia_summary: '<p>Le <b>Héron cendré</b> est une espèce d’échassiers. Il vit près de l&#39;eau.</p>',
  conservation_status: { status: 'LC', authority: 'IUCN Red List', iucn: 10 },
});

export const BLACKBIRD = inatTaxon({
  id: 900002,
  name: 'Turdus merula',
  preferred_common_name: 'Merle noir',
  observations_count: 400_000,
  ancestors: [...AVES, { id: 20, name: 'Passeriformes', rank: 'order' }, { id: 21, name: 'Turdidae', rank: 'family' }],
});

export const LYNX = inatTaxon({
  id: 900003,
  name: 'Lynx lynx',
  preferred_common_name: 'Lynx boréal',
  iconic_taxon_name: 'Mammalia',
  observations_count: 4_000,
  threatened: false,
  ancestors: [
    { id: 1, name: 'Animalia', rank: 'kingdom' },
    { id: 30, name: 'Mammalia', rank: 'class' },
    { id: 31, name: 'Carnivora', rank: 'order' },
    { id: 32, name: 'Felidae', rank: 'family' },
  ],
  conservation_status: { status: 'EN', authority: 'Liste rouge nationale (test)', iucn: 40, place: { id: 6753, name: 'France', display_name: 'France' } },
});

export const DRAGONFLY = inatTaxon({
  id: 900004,
  name: 'Anax imperator',
  preferred_common_name: 'Anax empereur',
  iconic_taxon_name: 'Insecta',
  observations_count: 30_000,
  ancestors: [
    { id: 1, name: 'Animalia', rank: 'kingdom' },
    { id: 40, name: 'Insecta', rank: 'class' },
    { id: 41, name: 'Odonata', rank: 'order' },
    { id: 42, name: 'Aeshnidae', rank: 'family' },
  ],
});

export const OAK = inatTaxon({ id: 900099, name: 'Quercus robur', iconic_taxon_name: 'Plantae', ancestors: [{ id: 47126, name: 'Plantae', rank: 'kingdom' }] });

export const FIXED_NOW = new Date('2026-10-01T12:00:00Z');
export const sp = (t: InatTaxon): Species => speciesFromInat(t, FIXED_NOW)!;

/** Réponse HTTP simulée pour fetch. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
