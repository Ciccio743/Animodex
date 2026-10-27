import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { BookOpen, ChevronDown, ChevronUp, LocateFixed, MapPinOff, PawPrint, RefreshCw, Search, Shuffle, X } from 'lucide-react';
import { useData, useOnline } from '../../hooks/useData';
import { TAXON_GROUPS, displayName, type IdentificationStatus, type Observation, type Rarity, type TaxonGroup } from '../../domain/models';
import { GROUP_LABELS, STATUS_LABELS } from '../../domain/labels';
import { displayPosition } from '../../domain/location';
import { areaConfidence, pickSurprise, type SurpriseResult } from '../../domain/discovery';
import { assignRarity } from '../../domain/rarity';
import { GROUP_ICON } from '../../components/typeTheme';
import { formatDate, formatDateTime } from '../../utils/format';
import { LeafletMap, type MapPoint } from '../map/LeafletMap';
import { GEO_STATUS_TEXT, useGeolocation } from '../../hooks/useGeolocation';
import { ExploreSearch, type RangeTaxon } from './ExploreSearch';
import { observationGridTilesUrl, type DiscoveryArea } from '../../services/sources/inaturalist';
import type { InatPlace } from '../../services/sources/inatSchemas';
import { getAreaSpecies, type AreaResult } from '../../services/catalogService';
import { apiErrorMessage } from '../../services/sources/http';
import { getMeta, setMeta } from '../../repositories/settings';

const RANGE_COLOR = '#ff6b1a';

export const STATUS_COLORS: Record<IdentificationStatus, string> = {
  confirmed: '#16c060',
  uncertain: '#f5b700',
  to_identify: '#a78bfa',
};

interface LatLng {
  lat: number;
  lng: number;
}
/** Zone explorée et son centre (pour déplacer la carte et savoir si on s'en est éloigné). */
interface Zone {
  area: DiscoveryArea;
  center?: LatLng;
}

/** Animal de la liste « autour de toi ». */
interface Item {
  taxonId: number;
  name: string;
  scientificName: string;
  group: TaxonGroup;
  thumb?: string;
  rarity: Rarity;
  count?: number;
}

const round2 = (x: number) => Math.round(x * 100) / 100;
function km(a: LatLng, b: LatLng): number {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}
function parseLocation(loc: string | null | undefined): LatLng | undefined {
  const [lat, lng] = (loc ?? '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && loc ? { lat, lng } : undefined;
}

/**
 * Explorer : une seule carte en plein écran. On y voit ses trouvailles, les animaux observés dans la zone
 * (liste en bas), et où trouver un animal (secteurs orange). Une seule barre de recherche : animal ou lieu.
 */
export function ExplorePage() {
  const { db, observations, speciesById, settings, progress, catalog } = useData();
  const online = useOnline();
  const [selectedId, setSelectedId] = useState<string>();
  const [showUnlocated, setShowUnlocated] = useState(false);
  const { fix, status: geoStatus } = useGeolocation(settings.autoLocate);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom: number; key: number }>();
  const [params, setParams] = useSearchParams();

  // Secteurs d'un animal (dans l'adresse : ?espece=<id iNaturalist>&nom=…, pour y revenir depuis une fiche).
  const rangeId = Number(params.get('espece'));
  const range: RangeTaxon | undefined =
    rangeId > 0
      ? { taxonId: rangeId, name: params.get('nom') ?? (speciesById.get(`inat-${rangeId}`) ? displayName(speciesById.get(`inat-${rangeId}`)!) : `Taxon ${rangeId}`) }
      : undefined;
  const overlay = useMemo(
    () =>
      range
        ? {
            url: observationGridTilesUrl(range.taxonId, RANGE_COLOR),
            attribution: 'Secteurs : observations <a href="https://www.inaturalist.org" target="_blank" rel="noopener">iNaturalist</a>',
            key: String(range.taxonId),
          }
        : undefined,
    [range?.taxonId], // eslint-disable-line react-hooks/exhaustive-deps
  );
  function showRange(t: RangeTaxon | undefined) {
    setParams(t ? { espece: String(t.taxonId), nom: t.name } : {}, { replace: true });
    setOpen(false);
    setSurprise(undefined);
    // Vue d'ensemble de la région pour voir les secteurs autour de toi.
    const c = zone?.center ?? fix;
    if (t && c) setFocus({ lat: c.lat, lng: c.lng, zoom: 10, key: Date.now() });
  }

  // ---------- Zone explorée : ta position, un lieu cherché, ou la partie de carte affichée ----------
  const [zone, setZone] = useState<Zone>();
  const userChose = useRef(false);
  const [view, setView] = useState<LatLng & { radiusKm: number }>();

  function chooseZone(z: Zone, byUser: boolean) {
    if (byUser) userChose.current = true;
    setZone(z);
    if (db) void setMeta(db, 'lastArea', JSON.stringify(z));
  }
  // Dernière zone mémorisée (libellé + coordonnées arrondies seulement).
  useEffect(() => {
    if (!db) return;
    void getMeta(db, 'lastArea').then((v) => {
      if (typeof v !== 'string') return;
      try {
        const saved = JSON.parse(v) as Zone | DiscoveryArea;
        const z: Zone = 'area' in saved ? saved : { area: saved, center: saved.kind === 'point' ? { lat: saved.lat, lng: saved.lng } : undefined };
        setZone((cur) => cur ?? z);
      } catch {
        /* valeur ignorée */
      }
    });
  }, [db]);
  // Ta position (arrondie à ~1 km avant tout envoi) devient la zone, sauf si tu as choisi un autre endroit.
  useEffect(() => {
    if (!fix || userChose.current) return;
    const lat = round2(fix.lat);
    const lng = round2(fix.lng);
    if (zone?.area.kind === 'point' && zone.area.lat === lat && zone.area.lng === lng) return;
    chooseZone({ area: { kind: 'point', lat, lng, radiusKm: 5, label: 'autour de toi' }, center: { lat, lng } }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix?.lat, fix?.lng]);

  function onPlace(p: InatPlace) {
    const center = parseLocation(p.location);
    chooseZone({ area: { kind: 'place', placeId: p.id, label: p.display_name ?? p.name }, center }, true);
    if (center) setFocus({ ...center, zoom: 12, key: Date.now() });
  }
  function searchHere() {
    if (!view) return;
    const radiusKm = Math.min(50, Math.max(1, Math.round(view.radiusKm * 0.7)));
    const lat = round2(view.lat);
    const lng = round2(view.lng);
    chooseZone({ area: { kind: 'point', lat, lng, radiusKm, label: 'dans cette zone' }, center: { lat, lng } }, true);
  }
  // La carte a été déplacée loin de la zone : proposer d'y chercher les animaux.
  const movedAway =
    !!view && view.radiusKm < 60 && (!zone?.center || km(zone.center, view) > Math.max(2, (zone.area.kind === 'point' ? zone.area.radiusKm : 5) * 0.6));

  // ---------- Animaux observés dans la zone ----------
  const [group, setGroup] = useState<TaxonGroup>();
  const [result, setResult] = useState<AreaResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  const [surprise, setSurprise] = useState<SurpriseResult<Item>>();
  const area = zone?.area;

  const load = useCallback(
    async (force = false) => {
      if (!db || !area) return;
      setLoading(true);
      setError(undefined);
      try {
        setResult(await getAreaSpecies(db, { area, group }, { force }));
      } catch (e) {
        setResult(undefined);
        setError(apiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [db, area, group],
  );
  useEffect(() => void load(), [load]);

  const items: Item[] = useMemo(() => {
    if (area && result)
      return result.items.map(({ summary, count }) => ({
        taxonId: summary.taxonId,
        name: displayName(summary),
        scientificName: summary.scientificName,
        group: summary.group,
        thumb: summary.photo?.thumbnailUrl,
        rarity: assignRarity(summary),
        count,
      }));
    return catalog
      .filter((s) => !group || s.group === group)
      .map((s) => ({ taxonId: s.inatTaxonId, name: displayName(s), scientificName: s.scientificName, group: s.group, thumb: s.media[0]?.thumbnailUrl, rarity: assignRarity(s) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [area, result, catalog, group]);

  // « Découverte surprise » demandée depuis l'accueil.
  useEffect(() => {
    if (params.get('surprise') !== '1' || loading) return;
    if (area && !result && !error) return; // attendre la liste de la zone
    setSurprise(pickSurprise(items, (i) => i.rarity));
    setParams({}, { replace: true });
  }, [params, setParams, loading, area, result, error, items]);

  // ---------- Tes trouvailles sur la carte ----------
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

  // Sans trouvaille placée, la carte se centre sur toi (ou sur la dernière zone) dès que possible.
  const centered = useRef(false);
  useEffect(() => {
    if (centered.current || points.length > 0) return;
    const c = fix ?? zone?.center;
    if (!c) return;
    centered.current = true;
    setFocus({ lat: c.lat, lng: c.lng, zoom: fix ? 14 : 12, key: Date.now() });
  }, [fix, zone, points.length]);

  const selected = observations.find((o) => o.id === selectedId);
  const selectedSpecies = selected?.speciesId ? speciesById.get(selected.speciesId) : undefined;
  const selectedPos = selected ? displayPosition(selected, selectedSpecies) : undefined;

  const sheet = 'pointer-events-auto rounded-2xl bg-night-900/95 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur';
  const count = area && result ? result.totalSpecies : items.length;
  const statusOf = (i: Item) =>
    progress.discoveredSpeciesIds.has(`inat-${i.taxonId}`) ? 'found' : progress.pendingSpeciesIds.has(`inat-${i.taxonId}`) ? 'pending' : 'new';

  return (
    // Carte en plein écran : de haut en bas, jusqu'à la barre de navigation.
    <div className="fixed inset-x-0 top-0 bottom-[calc(60px+var(--safe-bottom))] z-0">
      <h1 className="sr-only">Explorer</h1>
      <LeafletMap
        points={points}
        selectedId={selectedId}
        onSelect={setSelectedId}
        me={fix}
        focus={focus}
        overlay={overlay}
        onMoveEnd={setView}
        className="is-full h-full"
        label="Carte d’exploration"
        testId="observations-map"
      />

      {/* En haut : une seule recherche (animal ou lieu) et les états. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col items-center gap-2 px-3 pt-[calc(var(--safe-top)+0.5rem)]">
        <div className="pointer-events-auto w-full rounded-2xl bg-night-900/90 p-2 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <ExploreSearch value={range} onAnimal={showRange} onPlace={onPlace} />
        </div>
        {!online && <p className="pointer-events-auto self-start rounded-full bg-amber-400 px-3 py-1 text-xs font-medium text-black">Hors ligne : le fond de carte peut manquer.</p>}
        {geoStatus !== 'ok' && geoStatus !== 'off' && (
          <p className="pointer-events-auto w-full rounded-xl bg-night-900/90 px-3 py-2 text-xs text-white/80" role="status" data-testid="geo-status">
            {GEO_STATUS_TEXT[geoStatus]}
          </p>
        )}
        {movedAway && !open && (
          <button type="button" className="pointer-events-auto flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1b2420] shadow-lg" onClick={searchHere}>
            <Search size={16} aria-hidden="true" /> Chercher les animaux ici
          </button>
        )}
      </div>

      {/* À droite : surprise et recentrer. */}
      {!open && (
        <div className="absolute right-3 z-[1000] flex flex-col gap-2" style={{ bottom: '6.5rem' }}>
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full bg-gold-400 text-[#1b2420] shadow-lg disabled:opacity-50"
            onClick={() => {
              setSurprise(pickSurprise(items, (i) => i.rarity));
              setSelectedId(undefined);
            }}
            disabled={items.length === 0}
            aria-label="Découverte surprise"
          >
            <Shuffle size={22} aria-hidden="true" />
          </button>
          {fix && (
            <button
              type="button"
              className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#1b2420] shadow-lg"
              onClick={() => setFocus({ lat: fix.lat, lng: fix.lng, zoom: 16, key: Date.now() })}
              aria-label="Me recentrer sur ma position"
            >
              <LocateFixed size={22} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* En bas : trouvaille sélectionnée, surprise, ou liste des animaux de la zone. */}
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
        ) : surprise ? (
          <SurpriseCard
            result={surprise}
            discovered={progress.discoveredSpeciesIds.has(`inat-${surprise.item.taxonId}`)}
            onWhere={() => showRange({ taxonId: surprise.item.taxonId, name: surprise.item.name })}
            onClose={() => setSurprise(undefined)}
          />
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
          <>
            {unlocated.length > 0 && !open && (
              <button type="button" className="pointer-events-auto self-start rounded-full bg-night-900/90 px-3 py-2 text-xs text-white shadow-lg" onClick={() => setShowUnlocated(true)}>
                Sans position ({unlocated.length})
              </button>
            )}
            <section className={`${sheet} p-0`} aria-label="Animaux de la zone" data-testid="explore-sheet">
              <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-moss-300 text-night-950">
                  <PawPrint size={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">
                    {loading ? 'Recherche des animaux…' : area ? `${result ? `${count} animaux` : 'Animaux'} ${area.kind === 'point' ? area.label : `à ${area.label}`}` : `Ton catalogue (${count})`}
                  </span>
                  <span className="block text-xs text-white/60">{open ? 'Touche un animal pour voir où il a été vu' : 'Touche pour voir la liste'}</span>
                </span>
                {open ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
              </button>
              {open && (
                <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto px-4 pb-4">
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrer par groupe">
                    <button type="button" className="chip" aria-pressed={!group} onClick={() => setGroup(undefined)}>
                      Tous
                    </button>
                    {TAXON_GROUPS.map((g) => (
                      <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(group === g ? undefined : g)}>
                        {GROUP_LABELS[g]}
                      </button>
                    ))}
                  </div>
                  {!area && <p className="text-sm text-white/70">Active ta position, cherche un lieu, ou déplace la carte pour voir les animaux autour.</p>}
                  {error && (
                    <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/15 p-3 text-sm text-red-100 ring-1 ring-red-400/30">
                      <span>{error}</span>
                      <button type="button" className="btn btn-secondary min-h-10 text-sm" onClick={() => void load(true)}>
                        <RefreshCw size={16} aria-hidden="true" /> Réessayer
                      </button>
                    </div>
                  )}
                  {!loading && items.length === 0 && !error && <p className="text-sm text-white/60">Aucun animal trouvé ici. Essaie un autre groupe ou une autre zone.</p>}
                  {items.length > 0 && (
                    <ul className="flex flex-col gap-1" data-testid="discover-list">
                      {items.map((i) => (
                        <Row key={i.taxonId} item={i} status={statusOf(i)} onShow={() => showRange({ taxonId: i.taxonId, name: i.name })} />
                      ))}
                    </ul>
                  )}
                  {result && (
                    <p className="text-[11px] text-white/50" data-testid="area-source">
                      Animaux vus ici par d’autres naturalistes (iNaturalist), pas forcément visibles aujourd’hui. Données du {formatDateTime(result.fetchedAt)}
                      {result.stale ? ' (cache ancien, hors connexion)' : result.fromCache ? ' (cache local)' : ''}.
                    </p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ item, status, onShow }: { item: Item; status: 'found' | 'pending' | 'new'; onShow: () => void }) {
  const Icon = GROUP_ICON[item.group];
  const conf = item.count !== undefined ? areaConfidence(item.count) : undefined;
  return (
    <li className="flex items-center gap-2 rounded-xl bg-white/5 p-2">
      <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onShow} aria-label={`Où voir : ${item.name}`}>
        <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/5">
          {item.thumb ? (
            <img src={item.thumb} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <Icon size={22} className="text-white/70" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{item.name}</span>
            {status === 'found' && <span className="rounded-full bg-moss-300 px-2 text-[11px] font-bold text-black">✓ Trouvé</span>}
            {status === 'pending' && <span className="rounded-full bg-amber-400 px-2 text-[11px] font-bold text-black">À confirmer</span>}
          </span>
          <span className="block truncate text-xs text-white/60">{conf ? `${item.count} obs. — ${conf.label}` : GROUP_LABELS[item.group]}</span>
        </span>
      </button>
      <Link to={`/especes/inat-${item.taxonId}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10" aria-label={`Fiche : ${item.name}`}>
        <BookOpen size={18} aria-hidden="true" />
      </Link>
    </li>
  );
}

function SurpriseCard({ result, discovered, onWhere, onClose }: { result: SurpriseResult<Item>; discovered: boolean; onWhere: () => void; onClose: () => void }) {
  const { item } = result;
  return (
    <section className="pointer-events-auto relative rounded-2xl bg-night-900/95 p-4 shadow-2xl ring-1 ring-gold-400/40 backdrop-blur ax-reveal-glow" aria-labelledby="surprise-title" aria-live="polite">
      <button type="button" className="btn btn-ghost absolute right-1 top-1 min-h-10 px-3" onClick={onClose} aria-label="Fermer la découverte surprise">
        <X size={18} />
      </button>
      <p className="text-xs uppercase tracking-wide text-gold-300">Découverte surprise — animal à rechercher</p>
      <div className="mt-2 flex gap-3">
        {item.thumb && <img src={item.thumb} alt="" className="h-16 w-16 rounded-xl object-cover" referrerPolicy="no-referrer" />}
        <div>
          <h2 id="surprise-title" className="font-display text-2xl font-bold">
            {item.name}
          </h2>
          <p className="text-sm italic text-white/60">{item.scientificName}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" className="btn btn-secondary min-h-11 px-2 text-sm" onClick={onWhere}>
          Où le voir
        </button>
        <Link to={`/especes/inat-${item.taxonId}`} className="btn btn-secondary min-h-11 px-2 text-sm">
          Fiche
        </Link>
        <Link to={`/observations/nouvelle?taxon=${item.taxonId}`} className="btn btn-primary min-h-11 px-2 text-sm">
          {discovered ? 'Revu !' : 'Je l’ai vu !'}
        </Link>
      </div>
    </section>
  );
}
