import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useData, useOnline } from '../../hooks/useData';
import { matchesFilter } from '../../domain/discovery';
import { displayName } from '../../domain/models';
import { searchTaxa } from '../../services/sources/inaturalist';
import { summaryFromInat, type TaxonSummary } from '../../services/sources/inatMapping';
import { apiErrorMessage } from '../../services/sources/http';

export interface RangeTaxon {
  taxonId: number;
  name: string;
}

/**
 * « Où le trouver ? » : choisir un animal pour colorer, sur la carte, les secteurs où il a été observé.
 * Catalogue local d'abord, puis recherche iNaturalist si connecté.
 */
export function RangeSearch({ value, onChange }: { value?: RangeTaxon; onChange: (t: RangeTaxon | undefined) => void }) {
  const { catalog } = useData();
  const online = useOnline();
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<TaxonSummary[]>();
  const [error, setError] = useState<string>();
  const local = useMemo(() => (query.trim() ? catalog.filter((s) => matchesFilter(s, { query })).slice(0, 4) : []), [query, catalog]);

  useEffect(() => {
    const q = query.trim();
    setRemote(undefined);
    setError(undefined);
    if (q.length < 3 || !online) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchTaxa(q, ctrl.signal)
        .then((r) => setRemote(r.map(summaryFromInat).filter((x): x is TaxonSummary => !!x)))
        .catch((e) => !ctrl.signal.aborted && setError(apiErrorMessage(e)));
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, online]);

  function pick(t: RangeTaxon) {
    onChange(t);
    setQuery('');
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-orange-500/15 p-3 ring-1 ring-orange-400/50" data-testid="range-active">
        <span className="inline-block h-4 w-4 shrink-0 rounded-sm bg-[#ff6b1a] shadow-[0_0_10px_#ff6b1a]" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">{value.name}</span>
          <span className="block text-xs text-white/60">Carrés orange : secteurs où il a été observé (iNaturalist). Pas de carré ne veut pas dire qu’il n’y est pas.</span>
        </p>
        <button type="button" className="btn btn-ghost min-h-10 px-3" onClick={() => onChange(undefined)} aria-label="Effacer les secteurs">
          <X size={18} />
        </button>
      </div>
    );
  }

  const localIds = new Set(local.map((s) => s.inatTaxonId));
  const remoteOnly = (remote ?? []).filter((r) => !localIds.has(r.taxonId)).slice(0, 6);

  return (
    <div className="flex flex-col gap-2">
      <label className="relative">
        <span className="sr-only">Où trouver un animal ?</span>
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
        <input type="search" className="field w-full" style={{ paddingLeft: '2.5rem' }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Où trouver… écureuil roux, héron ?" maxLength={80} />
      </label>
      {!online && query.trim().length >= 3 && <p className="text-xs text-white/60">Hors ligne : les secteurs ne peuvent pas être chargés.</p>}
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
      {(local.length > 0 || remoteOnly.length > 0) && (
        <ul className="flex flex-col gap-1" aria-label="Animaux trouvés">
          {local.map((s) => (
            <li key={s.id}>
              <button type="button" role="option" aria-selected={false} className="w-full rounded-xl px-3 py-2 text-left text-sm ring-1 ring-white/10 hover:bg-white/5" onClick={() => pick({ taxonId: s.inatTaxonId, name: displayName(s) })}>
                {displayName(s)} <i className="text-white/50">{s.scientificName}</i>
              </button>
            </li>
          ))}
          {remoteOnly.map((t) => (
            <li key={t.taxonId}>
              <button type="button" role="option" aria-selected={false} className="w-full rounded-xl px-3 py-2 text-left text-sm ring-1 ring-white/10 hover:bg-white/5" onClick={() => pick({ taxonId: t.taxonId, name: t.frenchName ?? t.scientificName })}>
                {t.frenchName ?? t.scientificName} <i className="text-white/50">{t.scientificName}</i>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
