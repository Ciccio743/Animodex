import type { Page, Route } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * API iNaturalist / GBIF SIMULÉES pour les tests de parcours : réponses écrites à la main d'après la
 * documentation publique (identifiants, comptes et auteurs fictifs). Aucune donnée réelle.
 */
const ancestorsBird = [
  { id: 1, name: 'Animalia', rank: 'kingdom' },
  { id: 2, name: 'Chordata', rank: 'phylum' },
  { id: 3, name: 'Aves', rank: 'class' },
];
const photo = (id: number) => ({
  id,
  license_code: 'cc-by',
  attribution: `(c) Photographe Test ${id}, some rights reserved (CC BY)`,
  url: `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/square.jpg`,
});

export const HERON = {
  id: 900001,
  name: 'Ardea cinerea',
  rank: 'species',
  iconic_taxon_name: 'Aves',
  preferred_common_name: 'Héron cendré',
  observations_count: 150000,
  default_photo: photo(501),
  taxon_photos: [{ photo: photo(501) }],
  wikipedia_url: 'https://fr.wikipedia.org/wiki/Test',
  wikipedia_summary: 'Le Héron cendré est un grand échassier (texte de test).',
  conservation_status: { status: 'LC', authority: 'IUCN Red List', iucn: 10 },
  ancestors: [...ancestorsBird, { id: 10, name: 'Pelecaniformes', rank: 'order' }, { id: 11, name: 'Ardeidae', rank: 'family' }],
};
export const BLACKBIRD = {
  id: 900002,
  name: 'Turdus merula',
  rank: 'species',
  iconic_taxon_name: 'Aves',
  preferred_common_name: 'Merle noir',
  observations_count: 400000,
  default_photo: photo(601),
  taxon_photos: [{ photo: photo(601) }],
  ancestors: [...ancestorsBird, { id: 20, name: 'Passeriformes', rank: 'order' }, { id: 21, name: 'Turdidae', rank: 'family' }],
};
const TAXA = [HERON, BLACKBIRD];
const IMAGE = readFileSync(new URL('../../public/icons/icon-512.png', import.meta.url));

export interface ApiOptions {
  /** Sert une source vectorielle vide pour le fond « jeu » (sinon elle échoue et le fond OSM prend le relais). */
  vectorBasemap?: boolean;
  speciesCountsStatus?: number;
}

/** Installe les fausses API sur la page. Renvoie le compteur d'appels par chemin. */
export async function mockSources(page: Page, opts: ApiOptions = {}) {
  const calls: Record<string, number> = {};
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
  await page.context().route('https://api.inaturalist.org/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/v1', '');
    if (path.startsWith('/grid/')) {
      calls.grid = (calls.grid ?? 0) + 1;
      calls[`grid:${url.searchParams.get('taxon_id')}`] = 1;
      return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: IMAGE });
    }
    const key = path.split('/')[1] + (path.includes('species_counts') ? '/species_counts' : path.includes('autocomplete') ? '/autocomplete' : '');
    calls[key] = (calls[key] ?? 0) + 1;
    if (path.startsWith('/places/autocomplete')) return json(route, { results: [{ id: 123, name: 'Lyon', display_name: 'Lyon, FR', location: '45.76,4.83' }] });
    if (path.startsWith('/observations/species_counts')) {
      if (opts.speciesCountsStatus) return json(route, {}, opts.speciesCountsStatus);
      return json(route, { total_results: 2, results: [{ count: 42, taxon: HERON }, { count: 3, taxon: BLACKBIRD }] });
    }
    if (path.startsWith('/taxa/autocomplete')) {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      return json(route, { results: TAXA.filter((t) => t.preferred_common_name.toLowerCase().includes(q)) });
    }
    const ids = /\/taxa\/([\d,]+)/.exec(path)?.[1].split(',').map(Number) ?? [];
    return json(route, { results: TAXA.filter((t) => ids.includes(t.id)) });
  });
  await page.context().route('https://api.gbif.org/**', (route) => json(route, { matchType: 'NONE' }));
  await page.context().route('https://inaturalist-open-data.s3.amazonaws.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: IMAGE }),
  );
  // Fond « jeu » OpenFreeMap : indisponible par défaut (on vérifie ainsi le fond de secours), ou source vide.
  await page.context().route('https://tiles.openfreemap.org/**', (route) => {
    if (!opts.vectorBasemap) return route.abort();
    const url = route.request().url();
    if (url.endsWith('/planet'))
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ tilejson: '3.0.0', tiles: ['https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 14 }),
      });
    return route.fulfill({ status: 200, contentType: 'application/x-protobuf', headers: { 'Access-Control-Allow-Origin': '*' }, body: Buffer.alloc(0) });
  });
  // Fond de carte et recherche de lieu OpenStreetMap, simulés aussi (tuile = image de test).
  await page.context().route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: IMAGE }));
  await page.context().route('https://nominatim.openstreetmap.org/**', (route) =>
    route.request().url().includes('/reverse')
      ? json(route, { address: { state: 'Auvergne-Rhône-Alpes', country: 'France' } })
      : json(route, [{ display_name: 'Parc de la Tête d’Or, Lyon, France', lat: '45.7772', lon: '4.8545' }]),
  );
  return calls;
}
