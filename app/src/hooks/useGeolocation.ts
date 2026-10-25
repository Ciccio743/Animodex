import { useEffect, useState } from 'react';

export interface GeoFix {
  lat: number;
  lng: number;
  /** Rayon d'incertitude annoncé par le téléphone, en mètres. */
  accuracyM: number;
  at: number;
}

export type GeoStatus = 'off' | 'waiting' | 'ok' | 'denied' | 'unavailable';

/**
 * Suit la position du téléphone tant que le composant est affiché (si `enabled`).
 * La position reste dans la mémoire de la page : rien n'est envoyé ni enregistré ici.
 */
export function useGeolocation(enabled: boolean): { fix?: GeoFix; status: GeoStatus } {
  const [fix, setFix] = useState<GeoFix>();
  const [status, setStatus] = useState<GeoStatus>(enabled ? 'waiting' : 'off');

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('waiting');
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: Math.round(pos.coords.accuracy), at: pos.timestamp });
        setStatus('ok');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [enabled]);

  return { fix, status };
}

export const GEO_STATUS_TEXT: Record<Exclude<GeoStatus, 'ok' | 'off'>, string> = {
  waiting: 'Recherche de ta position…',
  denied: 'Position refusée. Pour l’activer : Réglages de l’iPhone → Confidentialité et sécurité → Service de localisation → Sites web Safari → « Lorsque l’app est active », puis recharge la page.',
  unavailable: 'Position introuvable pour le moment (GPS, réseau). Tu peux toucher la carte pour placer le point.',
};
