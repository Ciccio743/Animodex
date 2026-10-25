import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

/** Invite de mise à jour du service worker (jamais de rechargement surprise). */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div role="status" className="no-print fixed inset-x-3 bottom-[calc(5.5rem+var(--safe-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-night-700 p-3 shadow-xl ring-1 ring-white/15">
      <RefreshCw size={18} className="text-moss-300" aria-hidden="true" />
      <span className="flex-1 text-sm">Une nouvelle version d’Animodex est prête.</span>
      <button type="button" className="btn btn-ghost min-h-10 text-sm" onClick={() => setNeedRefresh(false)}>
        Plus tard
      </button>
      <button type="button" className="btn btn-primary min-h-10 text-sm" onClick={() => void updateServiceWorker(true)}>
        Mettre à jour
      </button>
    </div>
  );
}
