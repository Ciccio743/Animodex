import { useEffect, useMemo, useState } from 'react';
import { MapPin, PawPrint, Search, X } from 'lucide-react';
import { useData, useOnline } from '../../hooks/useData';
import { matchesFilter } from '../../domain/discovery';
import { displayName } from '../../domain/models';
import { searchPlaces, searchTaxa } from '../../services/sources/inaturalist';
import { summaryFromInat, type TaxonSummary } from '../../services/sources/inatMapping';
import type { InatPlace } from '../../services/sources/inatSchemas';
import { apiErrorMessage } from '../../services/sources/http';

export interface RangeTaxon {
  taxonId: number;
  name: string;
}

/**
 * Une seule barre de recherche pour explorer : un animal (ses secteurs s'affichent en orange sur la carte)
 * ou un lieu (la carte s'y déplace et liste les animaux observés là-bas).
 */
export function ExploreSearch({
  value,
  onAnimal,
  onPlace,
}: {
  value?: RangeTaxon;
  onAnimal: (t: RangeTaxon | undefined) => void;
  onPlace: (p: InatPlace) => void;
}) {
  const { catalog } = useData();
  const online = useOnline();
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<TaxonSummary[]>();
  const [places, setPlaces] = useState<InatPlace[]>();
  const [error, setError] = useState<string>();
  const local = useMemo(() => (query.trim() ? catalog.filter((s) => matchesFilter(s, { query })).slice(0, 4) : []), [query, catalog]);

  useEffect(() => {
    const q = query.trim();
    setRemote(undefined);
    setPlaces(undefined);
    setError(undefined);
    if (q.length < 3 || !online) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchTaxa(q, ctrl.signal)
        .then((r) => setRemote(r.map(summaryFromInat).filter((x): x is TaxonSummary => !!x)))
        .catch((e) => !ctrl.signal.aborted && setError(apiErrorMessage(e)));
      searchPlaces(q, ctrl.signal)
        .then((r) => setPlaces(r.slice(0, 3)))
        .catch(() => undefined);
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, online]);

  function pick(t: RangeTaxon) {
    onAnimal(t);
    setQuery('');
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-orange-500/15 p-3 ring-1 ring-orange-400/50" data-testid="range-active">
        <span className="inline-block h-4 w-4 shrink-0 rounded-sm bg-[#ff6b1a] shadow-[0_0_10px_#ff6b1a]" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">{value.name}</span>
          <span className="block text-xs text-white/60">En orange : là où il a été vu.</span>
        </p>
        <button type="button" className="btn btn-ghost min-h-10 px-3" onClick={() => onAnimal(undefined)} aria-label="Effacer les secteurs">
          <X size={18} />
        </button>
      </div>
    );
  }

  const localIds = new Set(local.map((s) => s.inatTaxonId));
  const remoteOnly = (remote ?? []).filter((r) => !localIds.has(r.taxonId)).slice(0, 5);
  const item = 'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ring-1 ring-white/10 hover:bg-white/5';

  return (
    <div className="flex flex-col gap-2">
      <label className="relative">
        <span className="sr-only">Chercher un animal ou un lieu</span>
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
        <input type="search" className="field w-full pl-10" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Un animal ou un lieu…" maxLength={80} />
      </label>
      {!online && query.trim().length >= 3 && <p className="text-xs text-white/60">Hors ligne : recherche limitée à ton catalogue.</p>}
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
      {(local.length > 0 || remoteOnly.length > 0 || (places?.length ?? 0) > 0) && (
        <ul className="flex max-h-[45vh] flex-col gap-1 overflow-y-auto" aria-label="Résultats">
          {local.map((s) => (
            <li key={s.id}>
              <button type="button" role="option" aria-selected={false} className={item} onClick={() => pick({ taxonId: s.inatTaxonId, name: displayName(s) })}>
                <PawPrint size={16} className="shrink-0 text-orange-300" aria-hidden="true" />
                <span>
                  {displayName(s)} <i className="text-white/50">{s.scientificName}</i>
                </span>
              </button>
            </li>
          ))}
          {remoteOnly.map((t) => (
            <li key={t.taxonId}>
              <button type="button" role="option" aria-selected={false} className={item} onClick={() => pick({ taxonId: t.taxonId, name: t.frenchName ?? t.scientificName })}>
                <PawPrint size={16} className="shrink-0 text-orange-300" aria-hidden="true" />
                <span>
                  {t.frenchName ?? t.scientificName} <i className="text-white/50">{t.scientificName}</i>
                </span>
              </button>
            </li>
          ))}
          {places?.map((p) => (
            <li key={`place-${p.id}`}>
              <button
                type="button"
                className={item}
                onClick={() => {
                  onPlace(p);
                  setQuery('');
                }}
              >
                <MapPin size={16} className="shrink-0 text-sky-300" aria-hidden="true" />
                <span>{p.display_name ?? p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
