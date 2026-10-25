import { describe, expect, it } from 'vitest';
import { ABILITIES, ABILITY_MAP } from '../data/abilities';
import { assignRarity, computeHp } from './rarity';
import { assignTypes } from './typing';
import { selectAbility } from './abilities';
import { ensureCard, generateCard } from './cards';
import { HP_RANGES } from './gameConfig';
import { RARITIES } from './models';
import { FALLBACK_RULE, TAXON_RULES, findTaxonRule } from './taxonRules';
import { BLACKBIRD, DRAGONFLY, HERON, LYNX, sp } from '../test/inatFixtures';

const heron = sp(HERON);

describe('calcul des PV', () => {
  it('reste dans la fourchette de la rareté, par pas de 5', () => {
    for (const r of RARITIES)
      for (const id of [0, 1, 7, 12345, 999_999]) {
        const hp = computeHp(r, id);
        expect(hp).toBeGreaterThanOrEqual(HP_RANGES[r].min);
        expect(hp).toBeLessThanOrEqual(HP_RANGES[r].max);
        expect(hp % 5).toBe(0);
      }
  });
  it('est stable pour un même taxon', () => {
    expect(computeHp('rare', 900001)).toBe(computeHp('rare', 900001));
  });
});

describe('attribution de la rareté', () => {
  it('suit les seuils du nombre mondial d’observations', () => {
    expect(assignRarity({ observationsCount: 400_000 })).toBe('common');
    expect(assignRarity({ observationsCount: 50_000 })).toBe('common');
    expect(assignRarity({ observationsCount: 49_999 })).toBe('rare');
    expect(assignRarity({ observationsCount: 10_000 })).toBe('rare');
    expect(assignRarity({ observationsCount: 9_999 })).toBe('epic');
    expect(assignRarity({ observationsCount: 999 })).toBe('legendary');
    expect(assignRarity({ observationsCount: undefined })).toBe('rare');
  });
  it('ne dépend pas du statut de conservation', () => {
    const lynx = sp(LYNX);
    expect(lynx.conservationStatus?.code).toBe('EN');
    expect(assignRarity(lynx)).toBe(assignRarity({ observationsCount: lynx.observationsCount }));
  });
});

describe('attribution des types', () => {
  it('suit la règle taxonomique la plus précise', () => {
    expect(assignTypes(heron)).toEqual({ primary: 'water', secondary: 'air' }); // famille Ardeidae
    expect(assignTypes(sp(BLACKBIRD))).toEqual({ primary: 'air', secondary: 'plant' }); // ordre Passeriformes
    expect(assignTypes(sp(LYNX))).toEqual({ primary: 'shadow', secondary: 'earth' }); // famille Felidae
    expect(assignTypes(sp(DRAGONFLY))).toEqual({ primary: 'insect', secondary: 'water' }); // ordre Odonata
  });
  it('utilise la classe puis la règle de repli', () => {
    expect(assignTypes({ taxonomy: { class: 'Aves', order: 'Inconnus' } }).primary).toBe('air');
    expect(findTaxonRule({ taxonomy: {} })).toBe(FALLBACK_RULE);
  });
  it('ne donne jamais un secondaire égal au principal', () => {
    for (const r of TAXON_RULES) expect(r.secondary).not.toBe(r.primary);
  });
});

describe('choix des capacités', () => {
  it('prend la candidate associée au type principal', () => {
    expect(selectAbility(heron, 'water', ABILITY_MAP).id).toBe('patience-du-pecheur');
  });
  it('se replie sur la capacité par défaut du type si aucune candidate n’existe', () => {
    const partial = new Map(ABILITY_MAP);
    partial.delete('patience-du-pecheur');
    partial.delete('plongeon');
    expect(selectAbility(heron, 'air', partial).id).toBe('vol-rapide');
    expect(() => selectAbility(heron, 'water', new Map())).toThrow();
  });
  it('toutes les règles référencent des capacités existantes', () => {
    for (const r of [...TAXON_RULES, FALLBACK_RULE]) for (const id of r.abilities) expect(ABILITY_MAP.has(id), `${r.name} → ${id}`).toBe(true);
  });
  it('chaque capacité a un effet, des types et une règle d’équilibrage', () => {
    for (const a of ABILITIES) {
      expect(a.associatedTypes.length).toBeGreaterThan(0);
      expect(a.effectText).not.toBe('');
      expect(a.balanceRule).toMatch(/^BR-/);
    }
  });
});

describe('création d’une carte', () => {
  it('produit une carte complète, déterministe, numérotée par le taxon', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const a = generateCard(heron, ABILITY_MAP, now);
    expect(generateCard(heron, ABILITY_MAP, now)).toEqual(a);
    expect(a).toMatchObject({
      id: 'card-inat-900001',
      cardNumber: 'AX-900001',
      primaryType: 'water',
      secondaryType: 'air',
      rarity: 'common',
      abilityId: 'patience-du-pecheur',
      visualVariant: 'water-common',
      rulesVersion: 1,
    });
  });
  it('ne recrée pas une carte existante', () => {
    const existing = generateCard(heron, ABILITY_MAP, new Date('2020-01-01'));
    const res = ensureCard(heron, existing, ABILITY_MAP);
    expect(res.created).toBe(false);
    expect(res.card).toBe(existing);
  });
});
