import { useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { BookOpen, Download, Plus, Printer, Sparkles } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Notice } from '../../components/Notice';
import { useData, usePhotoUrl } from '../../hooks/useData';
import { buildCardView } from './cardView';
import { AnimodexCardView } from './AnimodexCardView';
import { exportCardPng } from '../../services/cardExport';
import { formatShortDate } from '../../utils/format';
import { NotFoundPage } from '../../app/NotFoundPage';

export function CardPage() {
  const { speciesId = '' } = useParams();
  const [params] = useSearchParams();
  const isNew = params.get('nouvelle') === '1';
  const { progress, cardsBySpecies, observations, speciesById, status } = useData();
  const species = speciesById.get(speciesId);
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string>();

  // Photo : la plus récente observation confirmée de l'espèce qui possède une photo.
  const photoObs = useMemo(
    () => observations.find((o) => o.speciesId === speciesId && o.identificationStatus === 'confirmed' && o.photoIds.length > 0),
    [observations, speciesId],
  );
  const photoUrl = usePhotoUrl(photoObs?.photoIds[0], 'full');

  if (status === 'loading') return <p className="p-6 text-white/60">Chargement…</p>;
  if (!species) return <NotFoundPage />;
  const view = buildCardView(species, cardsBySpecies.get(species.id), progress);

  async function onExport() {
    if (!cardRef.current) return;
    setExporting(true);
    setExportError(undefined);
    try {
      await exportCardPng(cardRef.current, `animodex-${view.card.cardNumber}-${species!.id}.png`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader back title={view.unlocked ? `Carte ${view.card.cardNumber}` : 'Aperçu de la carte'} />
      {isNew && view.unlocked && (
        <p className="ax-reveal-glow flex items-center justify-center gap-2 text-center font-display text-2xl font-bold text-gold-300" role="status">
          <Sparkles aria-hidden="true" /> Nouvelle carte débloquée !
        </p>
      )}
      {!view.unlocked && (
        <Notice>Cette espèce n’est pas encore dans ta collection. Enregistre une observation confirmée pour débloquer sa carte.</Notice>
      )}
      <div className={`print-only-card mx-auto w-full max-w-[380px] ${isNew ? 'ax-reveal' : ''}`}>
        <AnimodexCardView
          ref={cardRef}
          view={view}
          photoUrl={view.unlocked ? photoUrl : undefined}
          photoCaption={photoObs ? `Photo : ton observation du ${formatShortDate(photoObs.observedAt)}` : undefined}
        />
      </div>

      {view.unlocked && (
        <p className="text-center text-sm text-white/70">
          {view.observationCount} observation{view.observationCount > 1 ? 's' : ''} · dernière le {formatShortDate(view.lastObservation!.observedAt)}
        </p>
      )}

      <div className="no-print grid grid-cols-2 gap-2 text-sm">
        <button type="button" className="btn btn-secondary" onClick={() => void onExport()} disabled={exporting || !view.unlocked}>
          <Download size={18} aria-hidden="true" /> {exporting ? 'Export…' : 'Exporter PNG'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()} disabled={!view.unlocked}>
          <Printer size={18} aria-hidden="true" /> Imprimer
        </button>
        <Link to={`/especes/${species.id}`} className="btn btn-secondary">
          <BookOpen size={18} aria-hidden="true" /> Fiche naturaliste
        </Link>
        <Link to={`/observations/nouvelle?species=${species.id}`} className="btn btn-primary">
          <Plus size={18} aria-hidden="true" /> Nouvelle observation
        </Link>
      </div>
      {exportError && <p className="text-sm text-red-300" role="alert">Export impossible : {exportError}</p>}
    </div>
  );
}
