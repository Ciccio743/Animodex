import { useEffect, useMemo, useState } from 'react';
import { Check, Globe, Search, X } from 'lucide-react';
import { GROUP_ICON } from '../../components/typeTheme';
import { useData, useOnline } from '../../hooks/useData';
import { matchesFilter } from '../../domain/discovery';
import { displayName } from '../../domain/models';
import { ensureSpecies } from '../../services/catalogService';
import { searchTaxa } from '../../services/sources/inaturalist';
import { summaryFromInat, type TaxonSummary } from '../../services/sources/inatMapping';
import { apiErrorMessage } from '../../services/sources/http';

/**
 * Recherche manuelle d'espèce : d'abord le catalogue local (hors ligne), puis iNaturalist si connecté.
 * Choisir un résultat en ligne ajoute sa fiche au catalogue local (pas à la collection).
 */
export function SpeciesPicker({ value, onChange }: { value?: string; onChange: (id: string | undefined) => void }) {
  const { db, catalog, speciesById } = useData();
  const online = useOnline();
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<TaxonSummary[]>();
  const [remoteState, setRemoteState] = useState<{ loading?: boolean; error?: string }>({});
  const [adding, setAdding] = useState<number>();
  const selected = value ? speciesById.get(value) : undefined;
  const local = useMemo(() => (query.trim() ? catalog.filter((s) => matchesFilter(s, { query })).slice(0, 6) : []), [query, catalog]);

  useEffect(() => {
    const q = query.trim();
    setRemote(undefined);
    if (q.length < 3 || !online) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setRemoteState({ loading: true });
      searchTaxa(q, ctrl.signal)
        .then((r) => {
          setRemote(r.map(summaryFromInat).filter((x): x is TaxonSummary => !!x));
          setRemoteState({});
        })
        .catch((e) => !ctrl.signal.aborted && setRemoteState({ error: apiErrorMessage(e) }));
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, online]);

  async function pickRemote(t: TaxonSummary) {
    if (!db) return;
    setAdding(t.taxonId);
    try {
      const { species } = await ensureSpecies(db, t.taxonId);
      onChange(species.id);
      setQuery('');
    } catch (e) {
      setRemoteState({ error: apiErrorMessage(e) });
    } finally {
      setAdding(undefined);
    }
  }

  if (selected) {
    const Icon = GROUP_ICON[selected.group];
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-moss-300/15 p-3 ring-1 ring-moss-300/40">
        {selected.media[0] ? (
          <img src={selected.media[0].thumbnailUrl} alt="" className="h-12 w-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
        ) : (
          <Icon size={24} className="text-moss-300" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold" data-testid="selected-species">
            {displayName(selected)}
          </div>
          <div className="text-xs italic text-white/60">{selected.scientificName}</div>
        </div>
        <button type="button" className="btn btn-ghost min-h-10 px-3" onClick={() => onChange(undefined)} aria-label="Changer d’espèce">
          <X size={18} />
        </button>
      </div>
    );
  }

  const localIds = new Set(local.map((s) => s.inatTaxonId));
  const remoteOnly = (remote ?? []).filter((r) => !localIds.has(r.taxonId));

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Rechercher l’espèce observée</span>
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
        <input type="search" className="field pl-10" placeholder="Tape un nom : merle, héron, Ardea…" value={query} onChange={(e) => setQuery(e.target.value)} aria-describedby="picker-help" />
      </label>
      <p id="picker-help" className="mt-1 text-xs text-white/50">
        {online ? 'Écris le début de son nom.' : 'Hors ligne : recherche limitée à ton catalogue local.'}
      </p>
      {query.trim() && (
        <ul className="mt-2 flex flex-col gap-1" role="listbox" aria-label="Espèces correspondantes">
          {local.map((s) => {
            const Icon = GROUP_ICON[s.group];
            return (
              <li key={s.id} role="option" aria-selected={false}>
                <button type="button" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5" onClick={() => onChange(s.id)}>
                  <Icon size={20} className="text-white/60" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{displayName(s)}</span>
                    <span className="block text-xs italic text-white/50">{s.scientificName}</span>
                  </span>
                  <Check size={16} className="text-white/30" aria-hidden="true" />
                </button>
              </li>
            );
          })}
          {remoteOnly.map((t) => {
            const Icon = GROUP_ICON[t.group];
            return (
              <li key={t.taxonId} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                  onClick={() => void pickRemote(t)}
                  disabled={adding !== undefined}
                >
                  {t.photo ? (
                    <img src={t.photo.thumbnailUrl} alt="" className="h-9 w-9 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Icon size={20} className="text-white/60" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t.frenchName ?? t.scientificName}</span>
                    <span className="block text-xs italic text-white/50">{t.scientificName}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-white/40">
                    <Globe size={12} aria-hidden="true" /> {adding === t.taxonId ? 'ajout…' : 'iNaturalist'}
                  </span>
                </button>
              </li>
            );
          })}
          {remoteState.loading && <li className="px-2 py-2 text-sm text-white/60">Recherche sur iNaturalist…</li>}
          {remoteState.error && <li className="px-2 py-2 text-sm text-amber-200">{remoteState.error}</li>}
          {!remoteState.loading && local.length === 0 && remoteOnly.length === 0 && (query.trim().length >= 3 || !online) && (
            <li className="px-2 py-2 text-sm text-white/60">Aucune espèce animale trouvée.</li>
          )}
        </ul>
      )}
    </div>
  );
}
