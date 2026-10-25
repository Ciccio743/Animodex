import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimodexCardView } from './AnimodexCardView';
import { buildCardView, discoveryLine } from './cardView';
import { HERON, LYNX, sp } from '../../test/inatFixtures';
import { ABILITY_MAP } from '../../data/abilities';
import { generateCard } from '../../domain/cards';
import { computeProgress } from '../../domain/progress';
import { makeObservation } from '../../test/fixtures';

const heron = sp(HERON);

describe('carte Animodex (composant)', () => {
  it('aperçu non découvert : bandeau, pas de lieu, photo de référence créditée', () => {
    const view = buildCardView(heron, undefined, computeProgress([], [heron]));
    render(<AnimodexCardView view={view} />);
    expect(screen.getByText('Aperçu — pas encore découverte')).toBeInTheDocument();
    expect(screen.getByText(/Photo de référence : Photographe Test 501 · CC BY-NC · iNaturalist/)).toBeInTheDocument();
    expect(screen.queryByText(/Première découverte/)).not.toBeInTheDocument();
    expect(screen.getByText('AX-900001')).toBeInTheDocument();
    expect(screen.getByText(/Wikipédia/)).toBeInTheDocument();
  });

  it('sans photo libre : remplacement explicite, sans image inventée', () => {
    const bare = { ...heron, media: [] };
    render(<AnimodexCardView view={buildCardView(bare, undefined, computeProgress([], [bare]))} />);
    expect(screen.getByText('Pas encore de photo')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Photo/ })).not.toBeInTheDocument();
  });

  it('la photo de l’utilisateur prime sur la photo de référence', () => {
    const view = buildCardView(heron, generateCard(heron, ABILITY_MAP), computeProgress([makeObservation()], [heron]));
    render(<AnimodexCardView view={view} photoUrl="blob:test" photoCaption="Photo : ton observation" />);
    expect(screen.getByRole('img', { name: /Photo d’observation/ })).toBeInTheDocument();
    expect(screen.queryByText(/Photo de référence/)).not.toBeInTheDocument();
  });

  it('carte débloquée : le lieu vient de la première observation réelle', () => {
    const obs = [
      makeObservation({ locationLabel: 'Étang', observedAt: '2026-04-01T10:00:00.000Z' }),
      makeObservation({ locationLabel: 'Rivière', observedAt: '2026-06-01T10:00:00.000Z' }),
    ];
    const view = buildCardView(heron, generateCard(heron, ABILITY_MAP), computeProgress(obs, [heron]));
    expect(discoveryLine(view)).toBe('Première découverte : Étang, 01/04/2026');
    render(<AnimodexCardView view={view} />);
    expect(screen.queryByText(/Aperçu/)).not.toBeInTheDocument();
    expect(screen.getByText(/Patience du pêcheur/)).toBeInTheDocument();
  });

  it('espèce sensible : le lieu est masqué', () => {
    const lynx = sp(LYNX);
    const view = buildCardView(lynx, generateCard(lynx, ABILITY_MAP), computeProgress([makeObservation({ speciesId: lynx.id, locationLabel: 'Forêt X' })], [lynx]));
    expect(discoveryLine(view)).toContain('lieu masqué');
    expect(discoveryLine(view)).not.toContain('Forêt X');
  });

  it('carte stockée mais plus aucune observation confirmée : redevient un aperçu', () => {
    const view = buildCardView(heron, generateCard(heron, ABILITY_MAP), computeProgress([], [heron]));
    expect(view.unlocked).toBe(false);
  });
});
