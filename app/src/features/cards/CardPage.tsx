import { useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { BookOpen, Download, Plus, Printer, Sparkles } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Notice } from '../../components/Notice';
import { useData, usePhotoUrl } from '../../hooks/useData';
import { buildCardView } from './cardView';
import { AnimodexCardView } from './AnimodexCardView';
import { CardFlip } from './CardFlip';
import { cardVersions } from '../../domain/cards';
import { CARD_FINISHES, FINISH_LABELS, formatFinishChance, type CardFinish } from '../../domain/finishes';
import { exportCardPng } from '../../services/cardExport';
import { formatShortDate } from '../../utils/format';
import { NotFoundPage } from '../../app/NotFoundPage';

export function CardPage() {
  const { speciesId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const isNew = params.get('nouvelle') === '1';
  const asFinish = (v: string | null) => ((CARD_FINISHES as readonly string[]).includes(v ?? '') ? (v as CardFinish) : undefined);
  const drawn = asFinish(params.get('finition'));
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
  const versions = cardVersions(view.card);
  const asked = asFinish(params.get('version')) ?? drawn;
  const shown = asked && versions.includes(asked) ? asked : versions[0];

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
      {drawn && view.unlocked && (
        <p className="ax-reveal-glow text-center text-sm font-semibold text-gold-300" role="status">
          {isNew ? 'Sorte de carte :' : 'Nouvelle carte ajoutée à ta collection :'} {FINISH_LABELS[drawn]} ({formatFinishChance(drawn)})
        </p>
      )}
      {!view.unlocked && (
        <Notice>Cette espèce n’est pas encore dans ta collection. Enregistre une observation confirmée pour débloquer sa carte.</Notice>
      )}
      <div className={`print-only-card mx-auto w-full max-w-[380px] px-2 ${isNew || drawn ? 'ax-reveal' : ''}`}>
        <CardFlip finish={shown}>
          <AnimodexCardView
            ref={cardRef}
            view={view}
            finish={shown}
            photoUrl={view.unlocked ? photoUrl : undefined}
          />
        </CardFlip>
      </div>
      <p className="no-print -mt-1 text-center text-xs text-white/60">Penche la carte du doigt · touche-la pour voir le dos</p>

      {view.unlocked && (
        <p className="text-center text-sm text-white/70">
          {view.observationCount} observation{view.observationCount > 1 ? 's' : ''} · dernière le {formatShortDate(view.lastObservation!.observedAt)}
        </p>
      )}
      {view.unlocked && versions.length > 1 && (
        <div className="no-print flex flex-col items-center gap-2">
          <p className="text-sm font-semibold">Tes {versions.length} cartes de cette espèce</p>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Choisir la carte">
            {versions.map((f) => (
              <button
                key={f}
                type="button"
                className="chip"
                aria-pressed={f === shown}
                onClick={() => setParams({ version: f }, { replace: true })}
              >
                {FINISH_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
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
