import { useState, type FormEvent } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import type { DiscoveryArea } from '../../services/sources/inaturalist';
import { searchPlaces } from '../../services/sources/inaturalist';
import type { InatPlace } from '../../services/sources/inatSchemas';
import { apiErrorMessage } from '../../services/sources/http';

export const RADII_KM = [1, 5, 10, 25, 50];

/**
 * Choix de la zone d'exploration : recherche d'un lieu (iNaturalist) ou position de l'appareil,
 * demandée uniquement après un appui explicite et arrondie à ~1 km avant tout envoi.
 */
export function AreaPicker({ area, onChange }: { area?: DiscoveryArea; onChange: (a: DiscoveryArea) => void }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<InatPlace[]>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<'search' | 'locate'>();

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setBusy('search');
    setError(undefined);
    try {
      setPlaces(await searchPlaces(query.trim()));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(undefined);
    }
  }

  function onLocate() {
    if (!('geolocation' in navigator)) {
      setError('La géolocalisation n’est pas disponible sur cet appareil. Cherche plutôt un lieu.');
      return;
    }
    setBusy('locate');
    setError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(undefined);
        // Arrondi à 2 décimales (~1 km) : la position exacte ne quitte jamais l'appareil.
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lng = Math.round(pos.coords.longitude * 100) / 100;
        onChange({ kind: 'point', lat, lng, radiusKm: area?.kind === 'point' ? area.radiusKm : 5, label: 'Autour de ma position' });
      },
      (err) => {
        setBusy(undefined);
        setError(err.code === err.PERMISSION_DENIED ? 'Position refusée : aucun souci, cherche un lieu à la place.' : 'Position introuvable pour le moment. Cherche un lieu à la place.');
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  }

  return (
    <section className="surface flex flex-col gap-3 p-4" aria-labelledby="area-title">
      <h2 id="area-title" className="font-semibold">
        Où explores-tu ?
      </h2>
      {area && (
        <p className="flex items-center gap-2 text-sm text-moss-300" data-testid="current-area">
          <MapPin size={16} aria-hidden="true" /> {area.label}
          {area.kind === 'point' && ` · rayon ${area.radiusKm} km`}
        </p>
      )}
      <form onSubmit={(e) => void onSearch(e)} className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Chercher une ville, un parc, une région</span>
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50" aria-hidden="true" />
          <input type="search" className="field pl-10" placeholder="Ville, parc, région…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-secondary" disabled={busy === 'search'}>
          {busy === 'search' ? '…' : 'Chercher'}
        </button>
      </form>
      {places && (
        <ul className="flex flex-col" aria-label="Lieux trouvés">
          {places.length === 0 && <li className="text-sm text-white/60">Aucun lieu trouvé.</li>}
          {places.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full rounded-lg px-2 py-2.5 text-left text-sm hover:bg-white/5"
                onClick={() => {
                  onChange({ kind: 'place', placeId: p.id, label: p.display_name ?? p.name });
                  setPlaces(undefined);
                  setQuery('');
                }}
              >
                {p.display_name ?? p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-secondary text-sm" onClick={onLocate} disabled={busy === 'locate'}>
          <LocateFixed size={18} aria-hidden="true" /> {busy === 'locate' ? 'Localisation…' : 'Utiliser ma position'}
        </button>
        {area?.kind === 'point' && (
          <label className="text-sm">
            <span className="sr-only">Rayon de recherche</span>
            <select className="field min-h-11 py-1 text-sm" value={area.radiusKm} onChange={(e) => onChange({ ...area, radiusKm: Number(e.target.value) })} aria-label="Rayon de recherche">
              {RADII_KM.map((r) => (
                <option key={r} value={r}>
                  Rayon {r} km
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="text-xs text-white/50">La position n’est demandée que si tu appuies sur le bouton. Elle est arrondie à environ 1 km et n’est jamais enregistrée avec précision.</p>
      {error && (
        <p role="alert" className="text-sm text-amber-200">
          {error}
        </p>
      )}
    </section>
  );
}
