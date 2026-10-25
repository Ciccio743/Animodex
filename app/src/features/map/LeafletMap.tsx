import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MaplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { GAME_ATTRIBUTION as GAME_ATTRIBUTION_SHORT, gameStyle } from './gameStyle';

/**
 * Fond de secours : tuiles OpenStreetMap standard (gratuit, sans clé), si le fond « jeu » vectoriel
 * ne peut pas s'afficher (pas de WebGL, service indisponible). Attribution visible, pas de téléchargement massif.
 */
export const BASE_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const BASE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contributeurs OpenStreetMap</a>';
/** Vue par défaut quand rien n'est encore placé (France métropolitaine). */
export const DEFAULT_VIEW = { center: [46.6, 2.4] as [number, number], zoom: 5 };

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  /** Rayon d'incertitude en mètres : 0 = épingle, sinon zone. */
  radiusM: number;
  color: string;
  label: string;
}

interface Props {
  points?: MapPoint[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Mode « placer un point » : toucher la carte ou déplacer l'épingle. */
  pick?: { value?: { lat: number; lng: number }; onPick: (lat: number, lng: number) => void };
  /** Recentre la carte quand cette valeur change (ex. après « ma position » ou une recherche). */
  focus?: { lat: number; lng: number; zoom: number; key: string | number };
  /** Couche de secteurs colorés (tuiles transparentes, ex. observations iNaturalist d'une espèce). */
  overlay?: { url: string; attribution: string; key: string };
  /** Position actuelle du téléphone (point bleu + cercle de précision). */
  me?: { lat: number; lng: number; accuracyM: number };
  className?: string;
  label: string;
  testId?: string;
}

function pinIcon(color: string, selected = false): L.DivIcon {
  return L.divIcon({
    className: 'ax-pin-wrap',
    html: `<span class="ax-pin${selected ? ' is-selected' : ''}" style="--pin:${color}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 26],
  });
}

/** Délai au-delà duquel le fond « jeu » est abandonné au profit du fond de secours. */
const VECTOR_TIMEOUT_MS = 8_000;

/**
 * Fond « jeu » minimal (tuiles vectorielles OpenFreeMap, style maison) ; en cas d'échec avant le premier
 * affichage, bascule sur les tuiles OpenStreetMap classiques. `data-basemap` indique le fond utilisé.
 */
function addBaseMap(m: L.Map, container: HTMLElement) {
  let settled = false;
  const fallback = (gl?: L.Layer) => {
    if (settled) return;
    settled = true;
    if (gl && m.hasLayer(gl)) m.removeLayer(gl);
    L.tileLayer(BASE_TILES, { maxZoom: 19, attribution: BASE_ATTRIBUTION, className: 'ax-base' }).addTo(m);
    container.dataset.basemap = 'raster';
  };
  try {
    const gl = new MaplibreGL({ style: gameStyle(), attributionControl: false }).addTo(m);
    container.dataset.basemap = 'loading';
    // L'attribution du fond vectoriel passe par le contrôle Leaflet.
    m.attributionControl.addAttribution(GAME_ATTRIBUTION_SHORT);
    const glMap = gl.getMaplibreMap();
    const timer = setTimeout(() => {
      m.attributionControl.removeAttribution(GAME_ATTRIBUTION_SHORT);
      fallback(gl);
    }, VECTOR_TIMEOUT_MS);
    glMap.once('load', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      container.dataset.basemap = 'vector';
    });
    glMap.on('error', () => {
      if (settled) return;
      clearTimeout(timer);
      m.attributionControl.removeAttribution(GAME_ATTRIBUTION_SHORT);
      fallback(gl);
    });
  } catch {
    // Pas de WebGL, par exemple.
    fallback();
  }
}

/** Petite enveloppe autour de Leaflet (sans dépendance React supplémentaire). */
export function LeafletMap({ points = [], selectedId, onSelect, pick, focus, me, overlay, className, label, testId }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>(undefined);
  const layer = useRef<L.LayerGroup>(undefined);
  const pickMarker = useRef<L.Marker>(undefined);
  const fitted = useRef(false);
  const meLayer = useRef<{ dot: L.CircleMarker; ring: L.Circle; zone: L.Circle }>(undefined);
  const overlayLayer = useRef<L.TileLayer>(undefined);
  const onPickRef = useRef(pick?.onPick);
  const onSelectRef = useRef(onSelect);
  onPickRef.current = pick?.onPick;
  onSelectRef.current = onSelect;
  const picking = !!pick;

  useEffect(() => {
    if (!el.current) return;
    const start = pick?.value ? { center: [pick.value.lat, pick.value.lng] as [number, number], zoom: 17 } : DEFAULT_VIEW;
    const m = L.map(el.current, { center: start.center, zoom: start.zoom, zoomControl: false, attributionControl: true });
    L.control.zoom({ position: 'bottomleft' }).addTo(m);
    m.attributionControl.setPrefix(false);
    addBaseMap(m, el.current);
    layer.current = L.layerGroup().addTo(m);
    if (picking) m.on('click', (e: L.LeafletMouseEvent) => onPickRef.current?.(e.latlng.lat, e.latlng.lng));
    map.current = m;
    // La carte peut être montée dans un conteneur qui vient d'apparaître.
    const t = setTimeout(() => m.invalidateSize(), 50);
    return () => {
      clearTimeout(t);
      m.remove();
      map.current = undefined;
      pickMarker.current = undefined;
      meLayer.current = undefined;
      overlayLayer.current = undefined;
      fitted.current = false;
    };
    // La carte est créée une seule fois par montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Points d'observation.
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    for (const p of points) {
      const selected = p.id === selectedId;
      const handler = () => onSelectRef.current?.(p.id);
      if (p.radiusM > 0) {
        L.circle([p.lat, p.lng], { radius: p.radiusM, color: p.color, weight: selected ? 3 : 1.5, fillOpacity: selected ? 0.35 : 0.2 })
          .bindTooltip(p.label)
          .on('click', handler)
          .addTo(g);
      }
      if (p.radiusM < 5_000) L.marker([p.lat, p.lng], { icon: pinIcon(p.color, selected), title: p.label, alt: p.label, keyboard: true }).on('click', handler).addTo(g);
    }
    if (!fitted.current && points.length > 0 && !picking) {
      fitted.current = true;
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
      m.fitBounds(bounds.pad(0.3), { maxZoom: points.some((p) => p.radiusM >= 5_000) ? 10 : 14 });
    }
  }, [points, selectedId, picking]);

  // Épingle du mode « placer un point ».
  const lat = pick?.value?.lat;
  const lng = pick?.value?.lng;
  useEffect(() => {
    const m = map.current;
    if (!m || !picking) return;
    if (lat === undefined || lng === undefined) {
      pickMarker.current?.remove();
      pickMarker.current = undefined;
      return;
    }
    if (!pickMarker.current) {
      pickMarker.current = L.marker([lat, lng], { icon: pinIcon('#f2c94c', true), draggable: true, title: 'Lieu de la trouvaille', alt: 'Lieu de la trouvaille' })
        .on('dragend', (e) => {
          const ll = (e.target as L.Marker).getLatLng();
          onPickRef.current?.(ll.lat, ll.lng);
        })
        .addTo(m);
    } else pickMarker.current.setLatLng([lat, lng]);
  }, [lat, lng, picking]);

  // Position actuelle du téléphone.
  const meLat = me?.lat;
  const meLng = me?.lng;
  const meAcc = me?.accuracyM;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (meLat === undefined || meLng === undefined) {
      meLayer.current?.dot.remove();
      meLayer.current?.ring.remove();
      meLayer.current?.zone.remove();
      meLayer.current = undefined;
      return;
    }
    if (!meLayer.current) {
      // Zone d'exploration de 1 km autour de toi, façon jeu.
      const zone = L.circle([meLat, meLng], { radius: 1_000, color: '#00a8d6', weight: 3, fillColor: '#00c2f0', fillOpacity: 0.1, dashArray: '10 8', interactive: false, className: 'ax-zone' }).addTo(m);
      const ring = L.circle([meLat, meLng], { radius: meAcc ?? 0, color: '#3b8cff', weight: 0, fillOpacity: 0.18, interactive: false }).addTo(m);
      const dot = L.circleMarker([meLat, meLng], { radius: 8, color: '#fff', weight: 3, fillColor: '#3b8cff', fillOpacity: 1, interactive: false, className: 'ax-me' }).addTo(m);
      meLayer.current = { dot, ring, zone };
    } else {
      meLayer.current.dot.setLatLng([meLat, meLng]);
      meLayer.current.ring.setLatLng([meLat, meLng]).setRadius(meAcc ?? 0);
      meLayer.current.zone.setLatLng([meLat, meLng]);
    }
  }, [meLat, meLng, meAcc]);

  // Secteurs colorés (au-dessus du fond, sous les épingles).
  const overlayKey = overlay?.key;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    overlayLayer.current?.remove();
    overlayLayer.current = undefined;
    if (overlay) overlayLayer.current = L.tileLayer(overlay.url, { maxZoom: 19, opacity: 0.75, attribution: overlay.attribution, className: 'ax-overlay' }).addTo(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayKey]);

  const focusKey = focus?.key;
  useEffect(() => {
    if (focus && map.current) map.current.setView([focus.lat, focus.lng], focus.zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return <div ref={el} role="region" aria-label={label} data-testid={testId} className={`ax-map ${className ?? ''}`} />;
}
