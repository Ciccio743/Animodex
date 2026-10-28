import { describe, expect, it } from 'vitest';
import { speciesHabitats } from './habitats';

describe('habitat estimé', () => {
  it('garde la donnée de la source quand elle existe', () => {
    expect(speciesHabitats({ habitats: ['forest'], taxonomy: { family: 'Ardeidae' } })).toEqual({ habitats: ['forest'], estimated: false });
  });
  it('estime d’après le genre, puis la famille, puis l’ordre', () => {
    expect(speciesHabitats({ habitats: [], taxonomy: { genus: 'Lutra', family: 'Mustelidae' } }).habitats).toEqual(['freshwater']);
    expect(speciesHabitats({ habitats: [], taxonomy: { genus: 'Ardea', family: 'Ardeidae' } })).toEqual({ habitats: ['wetland'], estimated: true });
    expect(speciesHabitats({ habitats: [], taxonomy: { family: 'Inconnue', order: 'Odonata' } }).habitats).toEqual(['wetland']);
  });
  it('sans correspondance : pas d’habitat inventé', () => {
    expect(speciesHabitats({ habitats: [], taxonomy: { family: 'Inconnue' } })).toEqual({ habitats: [], estimated: false });
  });
});
