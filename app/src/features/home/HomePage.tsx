import { useMemo } from 'react';
import { Link } from 'react-router';
import { Award, Map, MapPin, ShieldCheck } from 'lucide-react';
import { useData } from '../../hooks/useData';
import { ProgressBar } from '../../components/ProgressBar';
import { computeBadges } from '../../domain/badges';
import { buildCardView } from '../cards/cardView';
import { MiniCard } from '../cards/MiniCard';
import { tipOfTheDay } from './safetyTips';
import { formatDate } from '../../utils/format';
import { STATUS_LABELS } from '../../domain/labels';
import { displayName } from '../../domain/models';

export function HomePage() {
  const { progress, observations, cardsBySpecies, status, catalog, speciesById } = useData();
  const discovered = progress.discoveredSpeciesIds.size;

  const recent = useMemo(() => {
    const ids = [...progress.lastObservationBySpecies.values()]
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt))
      .slice(0, 4)
      .map((o) => o.speciesId!);
    return ids.filter((id) => speciesById.has(id)).map((id) => buildCardView(speciesById.get(id)!, cardsBySpecies.get(id), progress));
  }, [progress, cardsBySpecies, speciesById]);

  const nextGoal = useMemo(() => computeBadges(progress.discoveredSpeciesIds, catalog).find((b) => !b.unlocked), [progress, catalog]);

  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      <header className="pt-2">
        <h1 className="font-display text-4xl font-bold tracking-tight">Animodex</h1>
        <p className="mt-1 text-white/70">Trouve des animaux, photographie-les, collectionne leurs cartes.</p>
      </header>

      <Link to="/collection" className="surface-strong block p-4" aria-labelledby="progress-title">
        <div className="flex items-end justify-between">
          <h2 id="progress-title" className="font-semibold">
            Ton Animodex
          </h2>
          <span className="text-sm text-white/70" data-testid="home-progress">
            {discovered} espèce{discovered > 1 ? 's' : ''} découverte{discovered > 1 ? 's' : ''}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar value={discovered} max={Math.max(progress.catalogSize, 1)} label="Progression dans ton catalogue" />
        </div>
        {progress.toIdentifyCount > 0 && <p className="mt-2 text-xs text-amber-200">{progress.toIdentifyCount} observation{progress.toIdentifyCount > 1 ? 's' : ''} à identifier</p>}
      </Link>

      <Link to="/explorer" className="btn btn-primary min-h-16 text-lg">
        <Map aria-hidden="true" /> Explorer autour de moi
      </Link>
      <p className="-mt-3 text-center text-sm text-white/60">
        Tu as vu un animal ? Touche le <b className="text-moss-300">+</b> en bas.
      </p>

      {nextGoal && (
        <section className="surface flex items-center gap-3 p-4" aria-label="Objectif en cours">
          <Award className="shrink-0 text-gold-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-white/60">Objectif en cours</p>
            <p className="font-semibold">
              {nextGoal.name} — {nextGoal.description}
            </p>
            <div className="mt-2">
              <ProgressBar value={nextGoal.progress} max={nextGoal.goal} label={`Progression : ${nextGoal.name}`} />
            </div>
          </div>
          <span className="text-sm text-white/70">
            {nextGoal.progress}/{nextGoal.goal}
          </span>
        </section>
      )}

      <section aria-labelledby="recent-title">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="recent-title" className="font-display text-xl font-semibold">
            Dernières découvertes
          </h2>
          {recent.length > 0 && (
            <Link to="/collection" className="text-sm text-moss-300">
              Tout voir
            </Link>
          )}
        </div>
        {status === 'loading' ? (
          <p className="text-sm text-white/60">Chargement de ta collection…</p>
        ) : recent.length === 0 ? (
          <p className="surface p-4 text-sm text-white/70">
            Aucune découverte pour l’instant. Ta première carte apparaîtra ici dès que tu auras confirmé une observation.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {recent.map((v) => (
              <MiniCard key={v.species.id} view={v} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="obs-title">
        <h2 id="obs-title" className="mb-2 font-display text-xl font-semibold">
          Observations récentes
        </h2>
        {observations.length === 0 ? (
          <p className="surface p-4 text-sm text-white/70">Tes observations et leurs lieux apparaîtront ici.</p>
        ) : (
          <ul className="surface divide-y divide-white/5">
            {observations.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link to={`/observations/${o.id}`} className="flex items-center gap-3 px-4 py-3">
                  <MapPin size={18} className="shrink-0 text-moss-300" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{o.speciesId && speciesById.get(o.speciesId) ? displayName(speciesById.get(o.speciesId)!) : 'Animal à identifier'}</span>
                    <span className="block truncate text-xs text-white/60">
                      {formatDate(o.observedAt)} · {o.locationLabel ?? 'lieu non renseigné'} · {STATUS_LABELS[o.identificationStatus]}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface flex gap-3 p-4" aria-label="Conseil du jour">
        <ShieldCheck className="shrink-0 text-moss-300" aria-hidden="true" />
        <p className="text-sm">
          <span className="font-semibold">Conseil du naturaliste : </span>
          {tipOfTheDay()}
        </p>
      </section>
    </div>
  );
}
