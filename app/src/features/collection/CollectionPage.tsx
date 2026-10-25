import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Compass, LayoutGrid, List, Lock } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { ProgressBar } from '../../components/ProgressBar';
import { TypeBadge } from '../../components/TypeIcon';
import { RarityStars } from '../../components/RarityStars';
import { EmptyState } from '../../components/EmptyState';
import { useData } from '../../hooks/useData';
import { matchesFilter, type SpeciesFilter } from '../../domain/discovery';
import { breakdownBy } from '../../domain/progress';
import { GROUP_LABELS, RARITY_LABELS, TYPE_LABELS } from '../../domain/labels';
import { RARITIES, displayName } from '../../domain/models';
import { assignRarity } from '../../domain/rarity';
import { assignTypes } from '../../domain/typing';
import { SpeciesFilters } from '../discovery/SpeciesFilters';
import { buildCardView, type CardView } from '../cards/cardView';
import { MiniCard } from '../cards/MiniCard';
import { formatShortDate } from '../../utils/format';

type Sort = 'number' | 'name' | 'recent' | 'rarity';
const PAGE = 24;

export function CollectionPage() {
  const { progress, cardsBySpecies, catalog } = useData();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<SpeciesFilter>({});
  const [showLocked, setShowLocked] = useState(true);
  const [sort, setSort] = useState<Sort>('number');
  const [limit, setLimit] = useState(PAGE);

  const views = useMemo(() => {
    const list = catalog.filter((s) => matchesFilter(s, filter))
      .map((s) => buildCardView(s, cardsBySpecies.get(s.id), progress))
      .filter((v) => showLocked || v.unlocked);
    const rank = (v: CardView) => RARITIES.indexOf(v.card.rarity);
    const sorters: Record<Sort, (a: CardView, b: CardView) => number> = {
      number: (a, b) => a.card.cardNumber.localeCompare(b.card.cardNumber),
      name: (a, b) => displayName(a.species).localeCompare(displayName(b.species), 'fr'),
      recent: (a, b) => (b.lastObservation?.observedAt ?? '').localeCompare(a.lastObservation?.observedAt ?? ''),
      rarity: (a, b) => rank(b) - rank(a) || a.card.cardNumber.localeCompare(b.card.cardNumber),
    };
    return list.sort(sorters[sort]);
  }, [catalog, filter, cardsBySpecies, progress, showLocked, sort]);

  const discovered = progress.discoveredSpeciesIds;
  const byGroup = useMemo(() => breakdownBy(catalog, discovered, (s) => [s.group]), [catalog, discovered]);
  const byRarity = useMemo(() => breakdownBy(catalog, discovered, (s) => [assignRarity(s)]), [catalog, discovered]);
  const byType = useMemo(() => breakdownBy(catalog, discovered, (s) => [assignTypes(s).primary]), [catalog, discovered]);

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <PageHeader title="Collection" />
      <section className="surface-strong grid grid-cols-3 gap-2 p-4 text-center" aria-label="Résumé de la collection">
        <Stat value={discovered.size} label="espèces découvertes" testId="stat-species" />
        <Stat value={progress.totalObservations} label="observations" testId="stat-observations" />
        <Stat value={catalog.length} label="dans ton catalogue" testId="stat-catalog" />
        <div className="col-span-3 mt-1">
          <ProgressBar value={discovered.size} max={Math.max(progress.catalogSize, 1)} label="Progression dans le catalogue" />
        </div>
      </section>

      {catalog.length === 0 && (
        <EmptyState icon={Compass} title="Ton catalogue est vide">
          <p>Il se remplit avec les espèces que tu consultes, observes ou télécharges pour une zone depuis iNaturalist.</p>
          <Link to="/decouvrir" className="btn btn-primary mt-3">
            Partir à la découverte
          </Link>
        </EmptyState>
      )}

      <SpeciesFilters value={filter} onChange={(f) => (setFilter(f), setLimit(PAGE))} withRarity />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-moss-500" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
          Afficher les espèces non découvertes
        </label>
        <label className="ml-auto text-xs text-white/70">
          <span className="sr-only">Trier par</span>
          <select className="field min-h-10 py-1 text-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier par">
            <option value="number">N° de carte</option>
            <option value="name">Nom</option>
            <option value="recent">Dernière observation</option>
            <option value="rarity">Rareté</option>
          </select>
        </label>
        <div className="flex rounded-full bg-white/5 p-1" role="group" aria-label="Affichage">
          <button type="button" className="chip border-0" aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="Grille de cartes">
            <LayoutGrid size={16} />
          </button>
          <button type="button" className="chip border-0" aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="Liste">
            <List size={16} />
          </button>
        </div>
      </div>

      {views.length === 0 ? (
        <EmptyState icon={Lock} title={showLocked ? 'Aucune espèce ne correspond' : 'Aucune carte débloquée pour l’instant'}>
          {!showLocked && 'Confirme une observation pour obtenir ta première carte.'}
        </EmptyState>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-testid="collection-grid">
          {views.slice(0, limit).map((v) => (
            <MiniCard key={v.species.id} view={v} pending={progress.pendingSpeciesIds.has(v.species.id)} />
          ))}
        </div>
      ) : (
        <ul className="surface divide-y divide-white/5">
          {views.slice(0, limit).map((v) => (
            <li key={v.species.id}>
              <Link to={v.unlocked ? `/cartes/${v.species.id}` : `/especes/${v.species.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className="w-14 text-xs font-bold text-white/60">{v.card.cardNumber}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-medium ${v.unlocked ? '' : 'text-white/50'}`}>{displayName(v.species)}</span>
                  <span className="block text-xs text-white/60">
                    {v.unlocked
                      ? `${v.observationCount} observation${v.observationCount > 1 ? 's' : ''} · dernière le ${formatShortDate(v.lastObservation!.observedAt)}`
                      : progress.pendingSpeciesIds.has(v.species.id)
                        ? 'Identification à confirmer'
                        : 'Pas encore découverte'}
                  </span>
                </span>
                {v.unlocked ? <TypeBadge type={v.card.primaryType} compact /> : <Lock size={16} className="text-white/40" aria-label="Verrouillée" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {views.length > limit && (
        <button type="button" className="btn btn-secondary" onClick={() => setLimit((l) => l + PAGE)}>
          Afficher plus ({views.length - limit})
        </button>
      )}

      <section aria-labelledby="breakdown-title" className="flex flex-col gap-3">
        <h2 id="breakdown-title" className="mt-2 font-display text-xl font-semibold">
          Collections
        </h2>
        <Breakdown title="Par groupe" items={byGroup.map((b) => ({ ...b, label: GROUP_LABELS[b.key] }))} />
        <Breakdown
          title="Par rareté Animodex"
          items={RARITIES.map((r) => byRarity.find((b) => b.key === r)).filter((b) => !!b).map((b) => ({ ...b, label: RARITY_LABELS[b.key], extra: <RarityStars rarity={b.key} size={10} /> }))}
        />
        <Breakdown title="Par type" items={byType.map((b) => ({ ...b, label: TYPE_LABELS[b.key] }))} />
        <p className="text-xs text-white/50">
          Les collections par habitat demandent une source de données d’habitat (pas encore branchée) ; celles par région s’appuieront sur les coordonnées des observations (étape Carte).
        </p>
      </section>
    </div>
  );
}

function Stat({ value, label, testId }: { value: number | string; label: string; testId?: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold" data-testid={testId}>
        {value}
      </div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: { key: string; label: string; discovered: number; total: number; extra?: React.ReactNode }[] }) {
  return (
    <details className="surface p-4">
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((i) => (
          <li key={i.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {i.label} {i.extra}
              </span>
              <span className="text-white/60">
                {i.discovered}/{i.total}
              </span>
            </div>
            <ProgressBar value={i.discovered} max={i.total} label={`${title} : ${i.label}`} />
          </li>
        ))}
      </ul>
    </details>
  );
}
