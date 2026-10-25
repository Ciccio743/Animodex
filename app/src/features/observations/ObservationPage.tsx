import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BookOpen, CalendarDays, LayoutGrid, MapPin, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Notice } from '../../components/Notice';
import { useData, usePhotoUrl } from '../../hooks/useData';
import { displayName } from '../../domain/models';
import { PRECISION_LABELS, STATUS_LABELS } from '../../domain/labels';
import { deleteObservation } from '../../services/observationService';
import { formatDateTime } from '../../utils/format';
import { NotFoundPage } from '../../app/NotFoundPage';
import { displayPosition } from '../../domain/location';
import { LeafletMap } from '../map/LeafletMap';
import { STATUS_COLORS } from '../map/MapPage';

export function ObservationPage() {
  const { observationId = '' } = useParams();
  const navigate = useNavigate();
  const { db, observations, status, speciesById } = useData();
  const [confirm, setConfirm] = useState(false);
  const o = observations.find((x) => x.id === observationId);
  if (status === 'loading') return <p className="p-6 text-white/60">Chargement…</p>;
  if (!o) return <NotFoundPage />;
  const species = o.speciesId ? speciesById.get(o.speciesId) : undefined;

  const pos = displayPosition(o, species);

  async function onDelete() {
    if (!db) return;
    await deleteObservation(db, o!.id);
    navigate('/collection', { replace: true });
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <PageHeader back title={species ? displayName(species) : 'Animal à identifier'} subtitle={species && <i>{species.scientificName}</i>} />

      {o.photoIds.length > 0 && (
        <div className="grid gap-2">
          {o.photoIds.map((id) => (
            <Photo key={id} id={id} />
          ))}
        </div>
      )}

      <section className="surface flex flex-col gap-3 p-4 text-sm">
        <p className="flex items-center gap-2">
          <CalendarDays size={18} className="text-moss-300" aria-hidden="true" /> {formatDateTime(o.observedAt)}
        </p>
        <p className="flex items-start gap-2">
          <MapPin size={18} className="mt-0.5 shrink-0 text-moss-300" aria-hidden="true" />
          <span>
            {species?.sensitive ? 'Lieu masqué (espèce sensible)' : (o.locationLabel ?? 'Lieu non renseigné')}
            <span className="block text-xs text-white/60">Précision : {PRECISION_LABELS[o.locationPrecision]}</span>
          </span>
        </p>
        <p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${o.identificationStatus === 'confirmed' ? 'bg-moss-300 text-black' : 'bg-amber-400 text-black'}`}>
            {STATUS_LABELS[o.identificationStatus]}
          </span>
          <span className="ml-2 text-xs text-white/60">Source : {o.identificationSource === 'manual' ? 'identification manuelle' : o.identificationSource}</span>
        </p>
        {o.notes && <p className="whitespace-pre-wrap rounded-xl bg-black/20 p-3">{o.notes}</p>}
      </section>

      {pos && (
        <LeafletMap
          points={[{ id: o.id, ...pos, color: STATUS_COLORS[o.identificationStatus], label: pos.masked ? 'Position floutée (espèce sensible)' : 'Lieu de la trouvaille' }]}
          className="h-48"
          label="Carte : lieu de cette observation"
          testId="observation-map"
        />
      )}

      {o.identificationStatus !== 'confirmed' && (
        <Notice>Cette observation ne débloque pas encore de carte. Modifie-la quand l’identification sera sûre.</Notice>
      )}

      <div className="grid grid-cols-2 gap-2">
        {species && (
          <>
            <Link to={`/cartes/${species.id}`} className="btn btn-secondary">
              <LayoutGrid size={18} aria-hidden="true" /> Carte Animodex
            </Link>
            <Link to={`/especes/${species.id}`} className="btn btn-secondary">
              <BookOpen size={18} aria-hidden="true" /> Fiche naturaliste
            </Link>
          </>
        )}
        <Link to={`/observations/${o.id}/modifier`} className="btn btn-secondary">
          <Pencil size={18} aria-hidden="true" /> Modifier
        </Link>
        <button type="button" className="btn btn-secondary text-red-200" onClick={() => setConfirm(true)}>
          <Trash2 size={18} aria-hidden="true" /> Supprimer
        </button>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Supprimer cette observation ?"
        confirmLabel="Supprimer"
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={() => void onDelete()}
      >
        L’observation et ses {o.photoIds.length} photo{o.photoIds.length > 1 ? 's' : ''} seront effacées de cet appareil. La carte de l’espèce reste numérotée, mais redevient
        verrouillée si c’était ta seule observation confirmée.
      </ConfirmDialog>
    </div>
  );
}

function Photo({ id }: { id: string }) {
  const url = usePhotoUrl(id, 'full');
  return url ? <img src={url} alt="Photo de l’observation" className="w-full rounded-2xl object-cover" /> : <div className="aspect-[4/3] rounded-2xl bg-white/5" />;
}
