import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LocateFixed, MapPinOff, X } from 'lucide-react';
import { useData, useOnline } from '../../hooks/useData';
import { displayName, type IdentificationStatus, type Observation } from '../../domain/models';
import { STATUS_LABELS } from '../../domain/labels';
import { displayPosition } from '../../domain/location';
import { formatDate } from '../../utils/format';
import { LeafletMap, type MapPoint } from './LeafletMap';
import { GEO_STATUS_TEXT, useGeolocation } from '../../hooks/useGeolocation';
import { RangeSearch, type RangeTaxon } from './RangeSearch';
import { observationGridTilesUrl } from '../../services/sources/inaturalist';

const RANGE_COLOR = '#ff6b1a';

export const STATUS_COLORS: Record<IdentificationStatus, string> = {
  confirmed: '#16c060',
  uncertain: '#f5b700',
  to_identify: '#a78bfa',
};

/** Carte des trouvailles : uniquement les observations réelles qui ont une position enregistrée. */
export function MapPage() {
  const { observations, speciesById, settings } = useData();
  const online = useOnline();
  const [selectedId, setSelectedId] = useState<string>();
  const [showUnlocated, setShowUnlocated] = useState(false);
  const { fix, status: geoStatus } = useGeolocation(settings.autoLocate);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom: number; key: number }>();
  // Secteurs d'un animal (dans l'adresse : ?espece=<id iNaturalist>&nom=…, pour y revenir depuis une fiche).
  const [params, setParams] = useSearchParams();
  const rangeId = Number(params.get('espece'));
  const range: RangeTaxon | undefined =
    rangeId > 0 ? { taxonId: rangeId, name: params.get('nom') ?? (speciesById.get(`inat-${rangeId}`) ? displayName(speciesById.get(`inat-${rangeId}`)!) : `Taxon ${rangeId}`) } : undefined;
  const overlay = useMemo(
    () => (range ? { url: observationGridTilesUrl(range.taxonId, RANGE_COLOR), attribution: 'Secteurs : observations <a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a>', key: String(range.taxonId) } : undefined),
    [range?.taxonId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  function onRange(t: RangeTaxon | undefined) {
    setParams(t ? { espece: String(t.taxonId), nom: t.name } : {}, { replace: true });
    // Vue d'ensemble de la région pour voir les secteurs autour de toi.
    if (t && fix) setFocus({ lat: fix.lat, lng: fix.lng, zoom: 10, key: Date.now() });
  }

  const { points, unlocated } = useMemo(() => {
    const points: MapPoint[] = [];
    const unlocated: Observation[] = [];
    for (const o of observations) {
      const sp = o.speciesId ? speciesById.get(o.speciesId) : undefined;
      const pos = displayPosition(o, sp);
      if (!pos) {
        unlocated.push(o);
        continue;
      }
      points.push({ id: o.id, ...pos, color: STATUS_COLORS[o.identificationStatus], label: `${sp ? displayName(sp) : 'À identifier'} · ${formatDate(o.observedAt)}` });
    }
    return { points, unlocated };
  }, [observations, speciesById]);

  // Sans trouvaille placée, la carte se centre sur toi dès que la position arrive.
  const centered = useRef(false);
  useEffect(() => {
    if (!fix || centered.current || points.length > 0) return;
    centered.current = true;
    setFocus({ lat: fix.lat, lng: fix.lng, zoom: 16, key: Date.now() });
  }, [fix, points.length]);

  const selected = observations.find((o) => o.id === selectedId);
  const selectedSpecies = selected?.speciesId ? speciesById.get(selected.speciesId) : undefined;
  const selectedPos = selected ? displayPosition(selected, selectedSpecies) : undefined;


  const sheet = 'pointer-events-auto rounded-2xl bg-night-900/95 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur';

  return (
    // Carte en plein écran : de haut en bas, jusqu'à la barre de navigation.
    <div className="fixed inset-x-0 top-0 bottom-[calc(60px+var(--safe-bottom))] z-0">
      <h1 className="sr-only">Carte des découvertes</h1>
      <LeafletMap
        points={points}
        selectedId={selectedId}
        onSelect={setSelectedId}
        me={fix}
        focus={focus}
        overlay={overlay}
        className="is-full h-full"
        label="Carte de tes observations"
        testId="observations-map"
      />

      {/* En haut : recherche « Où le trouver ? » et états. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 px-3 pt-[calc(var(--safe-top)+0.5rem)]">
        <div className="pointer-events-auto rounded-2xl bg-night-900/90 p-2 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <RangeSearch value={range} onChange={onRange} />
        </div>
        {!online && <p className="pointer-events-auto self-start rounded-full bg-amber-400 px-3 py-1 text-xs font-medium text-black">Hors ligne : le fond de carte peut manquer.</p>}
        {geoStatus !== 'ok' && geoStatus !== 'off' && (
          <p className="pointer-events-auto rounded-xl bg-night-900/90 px-3 py-2 text-xs text-white/80" role="status" data-testid="geo-status">
            {GEO_STATUS_TEXT[geoStatus]}
          </p>
        )}
      </div>

      {/* À droite : recentrer. */}
      {fix && (
        <button
          type="button"
          className="absolute bottom-24 right-3 z-[1000] grid h-12 w-12 place-items-center rounded-full bg-white text-[#1b2420] shadow-lg"
          onClick={() => setFocus({ lat: fix.lat, lng: fix.lng, zoom: 17, key: Date.now() })}
          aria-label="Me recentrer sur ma position"
        >
          <LocateFixed size={22} aria-hidden="true" />
        </button>
      )}

      {/* En bas : trouvaille sélectionnée, liste « sans position », ou invitation à commencer. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex flex-col gap-2 px-3 pb-3">
        {selected ? (
          <section className={sheet} data-testid="map-selection" aria-live="polite">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{selectedSpecies ? displayName(selectedSpecies) : 'Animal à identifier'}</h2>
              <button type="button" className="-m-1 p-1 text-white/60" onClick={() => setSelectedId(undefined)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-white/70">
              {formatDate(selected.observedAt)} · {STATUS_LABELS[selected.identificationStatus]}
            </p>
            <p className="text-sm text-white/70">
              {selectedPos?.masked
                ? 'Espèce sensible : position volontairement floutée (~10 km).'
                : selectedPos?.radiusM
                  ? 'Position approximative (~1 km).'
                  : 'Position exacte (privée, sur cet appareil).'}
              {!selectedPos?.masked && selected.locationLabel && ` · ${selected.locationLabel}`}
            </p>
            <Link to={`/observations/${selected.id}`} className="btn btn-secondary mt-2 min-h-10 self-start text-sm">
              Voir l’observation
            </Link>
          </section>
        ) : showUnlocated ? (
          <section className={`${sheet} max-h-[45vh] overflow-y-auto`}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <MapPinOff size={18} className="text-white/60" aria-hidden="true" /> Sans position ({unlocated.length})
              </h2>
              <button type="button" className="-m-1 p-1 text-white/60" onClick={() => setShowUnlocated(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <ul className="mt-2 flex flex-col">
              {unlocated.map((o) => {
                const sp = o.speciesId ? speciesById.get(o.speciesId) : undefined;
                return (
                  <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm">
                    <Link to={`/observations/${o.id}`} className="min-w-0 flex-1 truncate hover:underline">
                      {sp ? displayName(sp) : 'À identifier'} <span className="text-white/50">· {formatDate(o.observedAt)}</span>
                    </Link>
                    <Link to={`/observations/${o.id}/modifier`} className="shrink-0 text-moss-300 hover:underline">
                      Placer
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          unlocated.length > 0 && (
            <button type="button" className="pointer-events-auto self-end rounded-full bg-night-900/90 px-3 py-2 text-xs text-white shadow-lg" onClick={() => setShowUnlocated(true)}>
              Sans position ({unlocated.length})
            </button>
          )
        )}
      </div>
    </div>
  );
}
