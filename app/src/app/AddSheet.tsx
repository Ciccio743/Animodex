import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { Camera, History, Images, PencilLine, X } from 'lucide-react';

export interface PickedFilesState {
  files: File[];
  source: 'camera' | 'import';
}

/**
 * Menu du bouton « + » : ajouter un animal avec l'appareil photo, une photo existante ou à la main.
 * Les sélecteurs de fichiers sont ouverts directement depuis le geste (exigence de Safari iOS),
 * puis les photos sont transmises au formulaire d'observation.
 */
export function AddSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  function withFiles(list: FileList | null, source: PickedFilesState['source']) {
    const files = list ? Array.from(list) : [];
    if (files.length === 0) return;
    onClose();
    navigate('/observations/nouvelle', { state: { files, source } satisfies PickedFilesState });
  }
  function go(to: string) {
    onClose();
    navigate(to);
  }

  const item = 'flex w-full items-center gap-4 rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10 active:bg-white/10';
  return (
    <div className="fixed inset-0 z-[2000] flex items-end bg-black/50" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter un animal"
        className="mx-auto w-full max-w-xl rounded-t-3xl bg-night-900 p-4 pb-[calc(1rem+var(--safe-bottom))] shadow-2xl ring-1 ring-white/10 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Ajouter un animal</h2>
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full bg-white/10" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className={item} onClick={() => cameraRef.current?.click()}>
            <Camera className="shrink-0 text-moss-300" aria-hidden="true" />
            <span>
              <span className="block font-semibold">Prendre une photo</span>
              <span className="block text-xs text-white/60">Ouvre l’appareil photo.</span>
            </span>
          </button>
          <button type="button" className={item} onClick={() => libraryRef.current?.click()}>
            <Images className="shrink-0 text-sky-300" aria-hidden="true" />
            <span>
              <span className="block font-semibold">Choisir une photo existante</span>
              <span className="block text-xs text-white/60">Depuis ta galerie.</span>
            </span>
          </button>
          <button type="button" className={item} onClick={() => go('/observations/nouvelle')}>
            <PencilLine className="shrink-0 text-gold-400" aria-hidden="true" />
            <span>
              <span className="block font-semibold">Noter à la main</span>
              <span className="block text-xs text-white/60">Sans photo : choisis l’animal, la position est placée toute seule.</span>
            </span>
          </button>
          <button type="button" className={item} onClick={() => go('/observations/nouvelle?passe=1')}>
            <History className="shrink-0 text-violet-300" aria-hidden="true" />
            <span>
              <span className="block font-semibold">Animal déjà rencontré</span>
              <span className="block text-xs text-white/60">Une rencontre passée : date et lieu à choisir.</span>
            </span>
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => withFiles(e.target.files, 'camera')} />
        <input ref={libraryRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-label="Choisir des photos" data-testid="add-library-input" onChange={(e) => withFiles(e.target.files, 'import')} />
      </div>
    </div>
  );
}
