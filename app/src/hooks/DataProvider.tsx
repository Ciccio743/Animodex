import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getDB, type DB } from '../db/database';
import type { AnimodexCard, Observation, Settings, Species } from '../domain/models';
import { DEFAULT_SETTINGS } from '../domain/models';
import { computeProgress, type CollectionProgress } from '../domain/progress';
import { listSpecies } from '../repositories/species';
import { listObservations } from '../repositories/observations';
import { listCards } from '../repositories/cards';
import { getMeta, getSettings } from '../repositories/settings';
import { subscribeDataChanged } from '../services/dataEvents';

export interface AnimodexData {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  db?: DB;
  observations: Observation[];
  /** Catalogue local (vide au départ, alimenté par les sources libres). */
  catalog: Species[];
  speciesById: Map<string, Species>;
  cardsBySpecies: Map<string, AnimodexCard>;
  settings: Settings;
  lastBackupAt?: string;
  progress: CollectionProgress;
  reload: () => void;
}

const EMPTY_PROGRESS = computeProgress([], []);

export const DataContext = createContext<AnimodexData>({
  status: 'loading',
  observations: [],
  catalog: [],
  speciesById: new Map(),
  cardsBySpecies: new Map(),
  settings: DEFAULT_SETTINGS,
  progress: EMPTY_PROGRESS,
  reload: () => undefined,
});

/** Charge les données locales et les recharge à chaque modification. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AnimodexData, 'progress' | 'reload'>>({
    status: 'loading',
    observations: [],
    catalog: [],
    speciesById: new Map(),
    cardsBySpecies: new Map(),
    settings: DEFAULT_SETTINGS,
  });

  const load = useCallback(async () => {
    try {
      const db = await getDB();
      const [observations, cards, settings, lastBackupAt, catalog] = await Promise.all([
        listObservations(db),
        listCards(db),
        getSettings(db),
        getMeta(db, 'lastBackupAt'),
        listSpecies(db),
      ]);
      setState({
        status: 'ready',
        db,
        observations,
        catalog,
        speciesById: new Map(catalog.map((x) => [x.id, x])),
        cardsBySpecies: new Map(cards.map((c) => [c.speciesId, c])),
        settings,
        lastBackupAt: typeof lastBackupAt === 'string' ? lastBackupAt : undefined,
      });
    } catch (e) {
      setState((s) => ({ ...s, status: 'error', error: e instanceof Error ? e.message : String(e) }));
    }
  }, []);

  useEffect(() => {
    void load();
    return subscribeDataChanged(() => void load());
  }, [load]);

  // Réglages d'affichage appliqués à la racine du document.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textScale = state.settings.textScale;
    if (state.settings.reducedMotion === 'system') delete root.dataset.motion;
    else root.dataset.motion = state.settings.reducedMotion;
  }, [state.settings.textScale, state.settings.reducedMotion]);

  const progress = useMemo(() => computeProgress(state.observations, state.catalog), [state.observations, state.catalog]);
  const value = useMemo(() => ({ ...state, progress, reload: () => void load() }), [state, progress, load]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
