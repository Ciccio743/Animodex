import { useContext, useEffect, useState } from 'react';
import { DataContext } from './DataProvider';
import { getPhoto } from '../repositories/photos';

export function useData() {
  return useContext(DataContext);
}

/** URL d'objet temporaire pour une photo locale (libérée automatiquement). */
export function usePhotoUrl(photoId: string | undefined, variant: 'full' | 'thumb' = 'thumb'): string | undefined {
  const { db } = useData();
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!db || !photoId) {
      setUrl(undefined);
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;
    void getPhoto(db, photoId).then((p) => {
      if (cancelled || !p) return;
      objectUrl = URL.createObjectURL(variant === 'full' ? p.blob : p.thumbBlob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [db, photoId, variant]);
  return url;
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
