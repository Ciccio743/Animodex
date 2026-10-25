import type { StyleSpecification } from 'maplibre-gl';

/**
 * Style de carte « jeu », volontairement minimal : nature (eau, forêts, prés), grandes routes et noms de villes.
 * Ni bâtiments, ni commerces, ni parkings, ni noms de rues.
 * Données : tuiles vectorielles OpenFreeMap (schéma OpenMapTiles, OpenStreetMap), gratuites et sans clé.
 */
export const OPENFREEMAP_SOURCE = 'https://tiles.openfreemap.org/planet';
export const OPENFREEMAP_GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
export const GAME_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · données © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contributeurs OpenStreetMap</a>';

export const GAME_COLORS = {
  meadow: '#eef7d9',
  farmland: '#f3f6cf',
  grass: '#c9eda3',
  wood: '#93d47a',
  wetland: '#bfe9d6',
  sand: '#f7e7a6',
  rock: '#e4dfd4',
  ice: '#ffffff',
  town: '#f6eee2',
  water: '#58c3f4',
  bigRoad: '#ffcf6e',
  road: '#ffffff',
  label: '#24493b',
} as const;

const C = GAME_COLORS;

export function gameStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Animodex jeu',
    glyphs: OPENFREEMAP_GLYPHS,
    sources: {
      omt: { type: 'vector', url: OPENFREEMAP_SOURCE },
    },
    layers: [
      { id: 'fond', type: 'background', paint: { 'background-color': C.meadow } },
      {
        id: 'couvert',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        paint: {
          'fill-color': [
            'match',
            ['get', 'class'],
            'wood', C.wood,
            'grass', C.grass,
            'farmland', C.farmland,
            'wetland', C.wetland,
            'sand', C.sand,
            'rock', C.rock,
            'ice', C.ice,
            C.grass,
          ],
          'fill-opacity': 0.9,
        },
      },
      { id: 'parcs', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': C.grass, 'fill-opacity': 0.8 } },
      {
        id: 'villes',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landuse',
        filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood', 'commercial', 'industrial', 'retail']]],
        paint: { 'fill-color': C.town, 'fill-opacity': 0.75 },
      },
      { id: 'eau', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': C.water } },
      {
        id: 'rivieres',
        type: 'line',
        source: 'omt',
        'source-layer': 'waterway',
        filter: ['in', ['get', 'class'], ['literal', ['river', 'canal', 'stream']]],
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': C.water,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, ['match', ['get', 'class'], 'stream', 0, 1], 14, ['match', ['get', 'class'], 'stream', 1.5, 4]],
        },
      },
      {
        id: 'routes',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        minzoom: 9,
        filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.road, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 16, 5], 'line-opacity': 0.9 },
      },
      {
        id: 'grandes-routes',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': C.bigRoad, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 16, 7] },
      },
      {
        id: 'noms-villes',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]],
        layout: {
          'text-field': ['coalesce', ['get', 'name:fr'], ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.06,
          'text-size': ['match', ['get', 'class'], 'city', 15, 'town', 13, 11],
          'text-max-width': 8,
        },
        paint: { 'text-color': C.label, 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      },
    ],
  };
}
