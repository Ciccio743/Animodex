import { describe, expect, it } from 'vitest';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { gameStyle } from './gameStyle';

describe('style de carte « jeu »', () => {
  it('est un style MapLibre valide', () => {
    expect(validateStyleMin(gameStyle())).toEqual([]);
  });

  it('reste minimal : ni bâtiments, ni noms de rues, ni points d’intérêt', () => {
    const layers = gameStyle().layers.map((l) => ('source-layer' in l ? l['source-layer'] : undefined));
    for (const banned of ['building', 'poi', 'transportation_name', 'housenumber', 'aerodrome_label']) expect(layers).not.toContain(banned);
  });
});
