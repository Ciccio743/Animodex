import { useEffect, useState, type KeyboardEvent } from 'react';
import { Crosshair, Map as MapIcon, Search, X } from 'lucide-react';
import type { LocationPrecision } from '../../domain/models';
import { positionToStore } from '../../domain/location';
import { searchPlace, type PlaceResult } from '../../services/sources/nominatim';
import { apiErrorMessage } from '../../services/sources/http';
import { LeafletMap } from '../map/LeafletMap';

export type PickedPrecision = Exclude<LocationPrecision, 'none'>;
export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  value?: LatLng;
  onChange: (v: LatLng | undefined) => void;
  precision: PickedPrecision;
  onPrecision: (p: PickedPrecision) => void;
  sensitive?: boolean;
  /** Position du téléphone suivie en direct (réglage « position automatique »). */
  me?: { lat: number; lng: number; accuracyM: number };
  /** Vrai tant que le point suit le GPS (l'utilisateur ne l'a pas déplacé). */
  following?: boolean;
  /** Message d'état du GPS (recherche, refus…). */
  geoMessage?: string;
  /** Affiche la carte d'emblée (rencontre passée : le lieu se pose à la main). */
  startOpen?: boolean;
}

/**
 * Placement facultatif de la trouvaille : toucher la carte, « Utiliser ma position » (sur action uniquement)
 * ou recherche d'un lieu. Rien n'est placé par défaut ; aucune coordonnée n'est inventée.
 */
export function LocationPicker({ value, onChange, precision, onPrecision, sensitive, me, following, geoMessage, startOpen }: Props) {
  const [open, setOpen] = useState(!!value || !!startOpen);
  const [busy, setBusy] = useState<'locate' | 'search'>();
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>();
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom: number; key: number }>();
  const hasValue = !!value;
  // Le point arrive tout seul (GPS) : on affiche la carte dessus.
  useEffect(() => {
    if (hasValue || startOpen) setOpen(true);
  }, [hasValue, startOpen]);

  function place(lat: number, lng: number, zoom?: number) {
    onChange({ lat, lng });
    setOpen(true);
    if (zoom) setFocus({ lat, lng, zoom, key: Date.now() });
  }

  function onLocate() {
    if (!('geolocation' in navigator)) {
      setError('La géolocalisation n’est pas disponible sur cet appareil. Touche la carte ou cherche un lieu.');
      return;
    }
    setBusy('locate');
    setError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(undefined);
        place(pos.coords.latitude, pos.coords.longitude, 16);
      },
      (err) => {
        setBusy(undefined);
        setError(err.code === err.PERMISSION_DENIED ? 'Position refusée : aucun souci, touche la carte pour placer ta trouvaille.' : 'Position introuvable pour le moment. Touche la carte à la place.');
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    );
  }

  async function onSearch() {
    if (query.trim().length < 2) return;
    setBusy('search');
    setError(undefined);
    try {
      const r = await searchPlace(query);
      setResults(r);
      setOpen(true);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(undefined);
    }
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    // Le champ est dans le formulaire d'observation : Entrée lance la recherche, pas l'enregistrement.
    if (e.key === 'Enter') {
      e.preventDefault();
      void onSearch();
    }
  }

  const stored = value ? positionToStore(value.lat, value.lng, precision) : undefined;

  return (
    <fieldset className="flex flex-col gap-3" data-testid="location-picker">
      <legend className="mb-2 font-semibold">Où l’as-tu trouvé ?</legend>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-secondary" onClick={onLocate} disabled={busy === 'locate'}>
          <Crosshair size={18} aria-hidden="true" /> {busy === 'locate' ? 'Localisation…' : 'Ma position'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <MapIcon size={18} aria-hidden="true" /> {open ? 'Fermer la carte' : 'Sur la carte'}
        </button>
      </div>

      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Chercher un lieu (ville, parc, lac…)</span>
          <input type="search" className="field w-full" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onSearchKey} placeholder="Chercher un lieu : parc, lac, ville…" maxLength={120} />
        </label>
        <button type="button" className="btn btn-secondary" onClick={() => void onSearch()} disabled={busy === 'search' || query.trim().length < 2} aria-label="Chercher ce lieu">
          <Search size={18} aria-hidden="true" />
        </button>
      </div>
      {results && (
        <ul className="flex flex-col gap-1" aria-label="Lieux trouvés">
          {results.length === 0 && <li className="text-sm text-white/60">Aucun lieu trouvé.</li>}
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2 text-left text-sm ring-1 ring-white/10 hover:bg-white/5"
                onClick={() => {
                  setResults(undefined);
                  setFocus({ lat: r.lat, lng: r.lng, zoom: 15, key: Date.now() });
                  setOpen(true);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}

      {geoMessage && !value && (
        <p className="text-sm text-white/70" role="status" data-testid="geo-status">
          {geoMessage}
        </p>
      )}

      {open && (
        <>
          <LeafletMap pick={{ value, onPick: (lat, lng) => place(lat, lng) }} me={me} focus={focus} className="h-64" label="Carte : touche pour placer ta trouvaille" testId="pick-map" />
          <p className="text-xs text-white/60">Touche la carte pour placer ta trouvaille, puis déplace l’épingle si besoin. Recherche de lieu et fond de carte : © OpenStreetMap.</p>
        </>
      )}

      {value && stored && (
        <div className="flex flex-col gap-2 rounded-2xl p-3 ring-1 ring-white/10">
          <p className="flex items-center justify-between gap-2 text-sm">
            <span>
              <span data-testid="picked-position" className="block">
                Point placé : {stored.latitude.toFixed(precision === 'exact' ? 5 : 2)}, {stored.longitude.toFixed(precision === 'exact' ? 5 : 2)}
              </span>
              {following && me && (
                <span className="block text-xs text-moss-300" data-testid="gps-following">
                  Ta position GPS (±{me.accuracyM} m), mise à jour en direct. Touche la carte pour le déplacer.
                </span>
              )}
            </span>
            <button type="button" className="btn btn-ghost min-h-9 text-sm" onClick={() => onChange(undefined)}>
              <X size={16} aria-hidden="true" /> Retirer
            </button>
          </p>
          <div className="flex flex-col gap-1" role="radiogroup" aria-label="Précision enregistrée">
            {(
              [
                    ['exact', 'Exacte', 'L’endroit précis de la trouvaille. Reste uniquement sur cet appareil.'],
                ['approximate', 'Approximative (~1 km)', 'Juste le coin, si tu préfères ne pas garder l’endroit exact.'],
              ] as const
            ).map(([p, title, help]) => (
              <label key={p} className="flex cursor-pointer items-start gap-3 py-1">
                <input type="radio" name="precision" className="mt-1 h-5 w-5 accent-moss-500" checked={precision === p} onChange={() => onPrecision(p)} />
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-white/60">{help}</span>
                </span>
              </label>
            ))}
          </div>
          {sensitive && <p className="text-xs text-amber-200">Espèce sensible : sa position sera toujours floutée (~10 km) à l’affichage.</p>}
        </div>
      )}
    </fieldset>
  );
}
