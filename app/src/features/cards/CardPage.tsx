import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { BookOpen, ChevronLeft, ChevronRight, Download, Pencil, Plus, Printer, Sparkles, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteObservation } from '../../services/observationService';
import { formatDate } from '../../utils/format';
import { STATUS_LABELS } from '../../domain/labels';
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
  const { db, progress, cardsBySpecies, observations, speciesById, catalog, status } = useData();
  const [toDelete, setToDelete] = useState<string>();
  const navigate = useNavigate();
  const [slide, setSlide] = useState<'next' | 'prev'>();
  const touch = useRef<{ x: number; y: number }>(undefined);

  // Toutes les cartes possédées, dans l'ordre de la collection (numéro), une par finition trouvée.
  const deck = useMemo(
    () =>
      catalog
        .filter((s) => progress.discoveredSpeciesIds.has(s.id) && cardsBySpecies.has(s.id))
        .sort((a, b) => a.cardNumber.localeCompare(b.cardNumber))
        .flatMap((s) => cardVersions(cardsBySpecies.get(s.id)!).map((finish) => ({ speciesId: s.id, finish }))),
    [catalog, progress, cardsBySpecies],
  );
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

  const position = deck.findIndex((d) => d.speciesId === species.id && d.finish === shown);
  function go(step: 1 | -1) {
    if (position < 0 || deck.length < 2) return;
    const d = deck[(position + step + deck.length) % deck.length];
    setSlide(step > 0 ? 'next' : 'prev');
    void navigate(`/cartes/${d.speciesId}?version=${d.finish}`, { replace: true });
  }
  const swipeable = view.unlocked && position >= 0 && deck.length > 1;

  // Tes rencontres avec cet animal, pour corriger ou supprimer une erreur.
  const mine = observations.filter((o) => o.speciesId === species.id);
  async function onDelete() {
    if (!db || !toDelete) return;
    const last = mine.length <= 1;
    await deleteObservation(db, toDelete);
    setToDelete(undefined);
    if (last) void navigate('/collection', { replace: true });
  }

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
      <div
        key={`${species.id}-${shown}`}
        className={`print-only-card mx-auto w-full max-w-[380px] px-2 ${isNew || drawn ? 'ax-reveal' : slide ? `ax-slide-${slide}` : ''}`}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = undefined;
          if (!start || !swipeable) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        <CardFlip finish={shown}>
          <AnimodexCardView
            ref={cardRef}
            view={view}
            finish={shown}
            photoUrl={view.unlocked ? photoUrl : undefined}
          />
        </CardFlip>
      </div>
      {swipeable && (
        <div className="no-print -mt-1 flex items-center justify-center gap-4">
          <button type="button" className="grid size-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 active:scale-95" onClick={() => go(-1)} aria-label="Carte précédente">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center text-sm font-semibold text-white/80" data-testid="deck-position">
            {position + 1} / {deck.length}
          </span>
          <button type="button" className="grid size-10 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15 active:scale-95" onClick={() => go(1)} aria-label="Carte suivante">
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="no-print -mt-1 text-center text-xs text-white/60">
        {swipeable ? 'Glisse pour voir tes autres cartes · touche-la pour voir le dos' : 'Penche la carte du doigt · touche-la pour voir le dos'}
      </p>

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

      {mine.length > 0 && (
        <section className="no-print flex flex-col gap-2" aria-labelledby="mine-title">
          <h2 id="mine-title" className="font-semibold">
            Tes rencontres ({mine.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {mine.map((o) => (
              <li key={o.id} className="flex items-center gap-2 rounded-2xl bg-white/5 p-2 pl-3 text-sm">
                <Link to={`/observations/${o.id}`} className="min-w-0 flex-1">
                  <span className="block font-medium">{formatDate(o.observedAt)}</span>
                  <span className="block truncate text-xs text-white/60">
                    {STATUS_LABELS[o.identificationStatus]}
                    {o.locationLabel ? ` · ${o.locationLabel}` : ''}
                  </span>
                </Link>
                <Link to={`/observations/${o.id}/modifier`} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10" aria-label={`Modifier la rencontre du ${formatDate(o.observedAt)}`}>
                  <Pencil size={17} aria-hidden="true" />
                </Link>
                <button type="button" className="grid size-10 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-200" onClick={() => setToDelete(o.id)} aria-label={`Supprimer la rencontre du ${formatDate(o.observedAt)}`}>
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette rencontre ?"
        confirmLabel="Supprimer"
        danger
        onCancel={() => setToDelete(undefined)}
        onConfirm={() => void onDelete()}
      >
        {mine.length <= 1
          ? 'C’est ta seule rencontre avec cet animal : sa carte sera retirée de ta collection.'
          : 'Cette rencontre et ses photos seront effacées. Ta carte reste dans ta collection.'}
      </ConfirmDialog>
    </div>
  );
}
