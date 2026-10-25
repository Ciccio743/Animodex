import { useMemo } from 'react';
import { Link } from 'react-router';
import { Award, BookOpen, Lock } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { ProgressBar } from '../../components/ProgressBar';
import { useData } from '../../hooks/useData';
import { computeXpEvents, levelFromXp, totalXp, XP_RULES } from '../../domain/xp';
import { computeBadges } from '../../domain/badges';
import { saveSettings } from '../../repositories/settings';
import type { Settings } from '../../domain/models';
import { BackupSection } from './BackupSection';
import { notifyDataChanged } from '../../services/dataEvents';

export function ProfilePage() {
  const { db, observations, progress, settings, catalog } = useData();
  const xp = useMemo(() => totalXp(computeXpEvents(observations, catalog)), [observations, catalog]);
  const lvl = levelFromXp(xp);
  const badges = useMemo(() => computeBadges(progress.discoveredSpeciesIds, catalog), [progress, catalog]);

  const monthly = useMemo(() => {
    const year = new Date().getFullYear();
    const counts = new Array<number>(12).fill(0);
    for (const o of observations) {
      const d = new Date(o.observedAt);
      if (d.getFullYear() === year) counts[d.getMonth()]++;
    }
    return { year, counts, total: counts.reduce((a, b) => a + b, 0) };
  }, [observations]);

  const update = (patch: Partial<Omit<Settings, 'id'>>) => db && void saveSettings(db, patch).then(notifyDataChanged);

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <PageHeader title="Profil" subtitle="Aucun compte nécessaire : tout reste sur cet appareil." />

      <section className="surface-strong p-4" aria-labelledby="level-title">
        <div className="flex items-baseline justify-between">
          <h2 id="level-title" className="font-display text-2xl font-bold">
            Niveau {lvl.level}
          </h2>
          <span className="text-sm text-white/70" data-testid="xp-total">
            {xp} XP
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={xp - lvl.current} max={lvl.next - lvl.current} label="Progression vers le niveau suivant" />
        </div>
        <p className="mt-1 text-xs text-white/60">Encore {lvl.next - xp} XP avant le niveau {lvl.level + 1}.</p>
        <details className="mt-2 text-xs text-white/60">
          <summary className="cursor-pointer">Comment gagner de l’XP ?</summary>
          <ul className="mt-1 list-disc pl-5">
            <li>Nouvelle espèce confirmée : +{XP_RULES.newSpecies}</li>
            <li>Premier animal d’un nouveau groupe : +{XP_RULES.newGroup}</li>
            <li>Nouvel ordre taxonomique : +{XP_RULES.newOrder}</li>
            <li>Nouvelle famille : +{XP_RULES.newFamily}</li>
            <li>Revoir une espèce connue : +{XP_RULES.repeatSighting} (une fois par espèce et par jour)</li>
          </ul>
          <p className="mt-1">Les observations incertaines ou à identifier ne rapportent rien tant qu’elles ne sont pas confirmées.</p>
        </details>
      </section>

      <section className="surface p-4" aria-labelledby="badges-title">
        <h2 id="badges-title" className="mb-3 font-display text-lg font-semibold">
          Badges
        </h2>
        <ul className="grid grid-cols-1 gap-2">
          {badges.map((b) => (
            <li key={b.id} className={`flex items-center gap-3 rounded-xl p-2 ${b.unlocked ? 'bg-gold-400/10' : ''}`}>
              {b.unlocked ? <Award className="text-gold-400" aria-hidden="true" /> : <Lock className="text-white/30" aria-hidden="true" />}
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {b.name} {b.unlocked && <span className="sr-only">(obtenu)</span>}
                </span>
                <span className="block text-xs text-white/60">{b.description}</span>
              </span>
              <span className="text-xs text-white/60">
                {b.progress}/{b.goal}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface p-4" aria-labelledby="stats-title">
        <h2 id="stats-title" className="mb-3 font-display text-lg font-semibold">
          Statistiques {monthly.year}
        </h2>
        <div className="flex h-24 items-end gap-1" role="img" aria-label={`${monthly.total} observations en ${monthly.year}, réparties par mois`}>
          {monthly.counts.map((c, i) => {
            const max = Math.max(1, ...monthly.counts);
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-moss-500/80" style={{ height: `${(c / max) * 72}px` }} />
                <span className="text-[10px] text-white/50">{'JFMAMJJASOND'[i]}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-white/60">
          {progress.discoveredSpeciesIds.size} espèces · {progress.totalObservations} observations au total
        </p>
      </section>

      <section className="surface flex flex-col gap-3 p-4" aria-labelledby="settings-title">
        <h2 id="settings-title" className="font-display text-lg font-semibold">
          Réglages
        </h2>
        <label className="flex items-center justify-between gap-3 text-sm">
          Taille du texte
          <select className="field w-40 min-h-11 text-sm" value={settings.textScale} onChange={(e) => update({ textScale: e.target.value as Settings['textScale'] })}>
            <option value="normal">Normale</option>
            <option value="large">Grande</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          Animations
          <select className="field w-40 min-h-11 text-sm" value={settings.reducedMotion} onChange={(e) => update({ reducedMotion: e.target.value as Settings['reducedMotion'] })}>
            <option value="system">Selon le système</option>
            <option value="reduce">Réduites</option>
            <option value="full">Complètes</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Position automatique
            <span className="block text-xs text-white/50">Ta position sur la carte et dans chaque nouvelle observation.</span>
          </span>
          <input type="checkbox" role="switch" className="h-6 w-6 accent-moss-500" checked={settings.autoLocate} onChange={(e) => update({ autoLocate: e.target.checked })} />
        </label>
        <p className="text-xs text-white/50">
          Confidentialité : pas de compte, pas de publicité, pas de partage automatique. Ta position reste sur ce téléphone ; seules les espèces sensibles sont floutées sur
          la carte.
        </p>
      </section>

      <BackupSection />

      <Link to="/a-propos" className="btn btn-secondary">
        <BookOpen size={18} aria-hidden="true" /> Sources, licences et sécurité
      </Link>
    </div>
  );
}
