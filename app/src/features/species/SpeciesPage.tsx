import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ExternalLink, Eye, ImageOff, LayoutGrid, ShieldAlert, Map as MapIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Notice } from '../../components/Notice';
import { TypeBadge } from '../../components/TypeIcon';
import { RarityStars } from '../../components/RarityStars';
import { ensureSpecies } from '../../services/catalogService';
import { ApiError, apiErrorMessage } from '../../services/sources/http';
import { findTaxonRule } from '../../domain/taxonRules';
import { useData, usePhotoUrl } from '../../hooks/useData';
import { ACTIVITY_LABELS, CONSERVATION_LABELS, GROUP_LABELS, HABITAT_LABELS, STATUS_LABELS } from '../../domain/labels';
import { buildCardView } from '../cards/cardView';
import { formatDate } from '../../utils/format';
import { NotFoundPage } from '../../app/NotFoundPage';
import { displayName, type Observation } from '../../domain/models';

const NA = 'Donnée non disponible';

export function SpeciesPage() {
  const { speciesId = '' } = useParams();
  const { db, status, progress, cardsBySpecies, observations, speciesById } = useData();
  const [fetchState, setFetchState] = useState<{ loading: boolean; error?: string; stale?: boolean }>({ loading: false });
  const s = speciesById.get(speciesId);
  const taxonId = /^inat-(\d+)$/.exec(speciesId)?.[1];

  const refresh = useCallback(
    async (force: boolean) => {
      if (!db || !taxonId) return;
      setFetchState({ loading: true });
      try {
        const r = await ensureSpecies(db, Number(taxonId), { force });
        setFetchState({ loading: false, stale: r.stale });
      } catch (e) {
        setFetchState({ loading: false, error: e instanceof ApiError ? apiErrorMessage(e) : e instanceof Error ? e.message : String(e) });
      }
    },
    [db, taxonId],
  );

  // Fiche absente du catalogue : on la récupère auprès d'iNaturalist (elle rejoint le catalogue, pas la collection).
  useEffect(() => {
    if (status === 'ready' && !s && taxonId && !fetchState.loading && !fetchState.error) void refresh(false);
  }, [status, s, taxonId, refresh, fetchState.loading, fetchState.error]);

  if (!taxonId) return <NotFoundPage />;
  if (!s) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader back title="Fiche naturaliste" />
        {fetchState.error ? (
          <Notice tone="warning">
            {fetchState.error}
            <button type="button" className="btn btn-secondary mt-3 w-full" onClick={() => void refresh(true)}>
              Réessayer
            </button>
          </Notice>
        ) : (
          <p className="text-white/60" role="status">
            Récupération de la fiche auprès d’iNaturalist…
          </p>
        )}
      </div>
    );
  }

  const view = buildCardView(s, cardsBySpecies.get(s.id), progress);
  const mine = observations.filter((o) => o.speciesId === s.id);
  const rule = findTaxonRule(s);
  const name = displayName(s);
  const cs = s.conservationStatus;

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <PageHeader back title={name} subtitle={<i>{s.scientificName}</i>} />

      <p className="text-xs text-white/60" data-testid="species-source">
        Fiche issue d’iNaturalist, récupérée le {formatDate(s.fetchedAt)}
        {fetchState.stale && ' (connexion indisponible : version enregistrée)'}.{' '}
        <button type="button" className="underline" onClick={() => void refresh(true)} disabled={fetchState.loading}>
          {fetchState.loading ? 'Mise à jour…' : 'Mettre à jour'}
        </button>
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Link to={`/observations/nouvelle?species=${s.id}`} className="btn btn-primary">
          <Eye size={18} aria-hidden="true" /> J’ai vu cet animal
        </Link>
        <Link to={`/cartes/${s.id}`} className="btn btn-secondary">
          <LayoutGrid size={18} aria-hidden="true" /> {view.unlocked ? 'Ma carte' : 'Aperçu de la carte'}
        </Link>
        <Link to={`/carte?espece=${s.inatTaxonId}&nom=${encodeURIComponent(displayName(s))}`} className="btn btn-secondary col-span-2">
          <MapIcon size={18} aria-hidden="true" /> Où le trouver ?
        </Link>
      </div>

      <Section title="Photographies">
        {s.media.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-white/60">
            <ImageOff size={16} aria-hidden="true" /> Aucune photo sous licence libre disponible pour cette espèce.
          </p>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
            {s.media.map((m) => (
              <figure key={m.id} className="w-64 shrink-0 snap-start">
                <img src={m.url} alt={`Photo de référence : ${name}`} className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" referrerPolicy="no-referrer" />
                <figcaption className="mt-1 text-[11px] text-white/60">
                  {m.attribution} · {m.license} ·{' '}
                  <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                    {m.source}
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <MyPhotos observations={mine} />
      </Section>

      <Section title="Identité">
        <Row label="Nom français" value={s.frenchName} />
        <Row label="Nom scientifique" value={<i>{s.scientificName}</i>} />
        <Row label="Autres noms" value={s.commonNames.length ? s.commonNames.join(', ') : undefined} />
        <Row label="Groupe" value={GROUP_LABELS[s.group]} />
        <Row label="Embranchement" value={s.taxonomy.phylum} />
        <Row label="Classe" value={s.taxonomy.class} />
        <Row label="Ordre" value={s.taxonomy.order} />
        <Row label="Famille" value={s.taxonomy.family} />
        <Row label="Genre" value={s.taxonomy.genus && <i>{s.taxonomy.genus}</i>} />
      </Section>

      <Section title="Description">
        {s.description ? (
          <>
            <p className="text-sm leading-relaxed">{s.description.text}</p>
            <p className="mt-2 text-xs text-white/50">
              Source : {s.description.source}, licence {s.description.license}.{' '}
              {s.description.url && (
                <a href={s.description.url} target="_blank" rel="noreferrer" className="underline">
                  Lire l’article
                </a>
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-white/40">{NA}</p>
        )}
      </Section>

      <Section title="Caractéristiques et écologie">
        <Row label="Taille" value={s.physicalCharacteristics?.length?.value} />
        <Row label="Poids" value={s.physicalCharacteristics?.mass?.value} />
        <Row label="Longévité" value={s.longevity?.value} />
        <Row label="Régime alimentaire" value={s.diet} />
        <Row label="Habitat" value={s.habitatText ?? (s.habitats.length ? s.habitats.map((h) => HABITAT_LABELS[h]).join(', ') : undefined)} />
        <Row label="Répartition" value={s.distribution} />
        <Row label="Activité" value={s.activity && ACTIVITY_LABELS[s.activity]} />
        <Row label="Comportement" value={s.behavior} />
        <Row label="Reproduction" value={s.reproduction} />
        <p className="pt-1 text-xs text-white/50">Ces champs ne sont pas fournis par les sources branchées pour l’instant : rien n’est inventé.</p>
      </Section>

      <Section title="Statut de conservation">
        {cs ? (
          <div className="text-sm">
            <p>
              <b>{cs.category ? CONSERVATION_LABELS[cs.category] : cs.code}</b> ({cs.code}) — {cs.placeName ? `statut pour : ${cs.placeName}` : 'statut mondial'}
              {cs.authority && `, ${cs.authority}`}.
            </p>
            <a href={cs.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-moss-300 underline">
              Voir la source <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <p className="text-sm text-white/60">{NA}</p>
        )}
        {s.observationsCount !== undefined && (
          <p className="pt-2 text-xs text-white/60">{s.observationsCount.toLocaleString('fr-FR')} observations sur iNaturalist dans le monde (à la date de la fiche).</p>
        )}
        {s.sensitive && (
          <p className="mt-2 flex items-start gap-2 text-xs text-amber-200">
            <ShieldAlert size={16} className="shrink-0" aria-hidden="true" /> Espèce sensible : Animodex n’affiche jamais le lieu précis de ses observations.
          </p>
        )}
      </Section>

      <Section title="Animodex — statistiques de jeu">
        <p className="mb-2 text-xs text-white/60">Classement ludique et fictif, sans lien avec le statut de conservation ni l’abondance locale.</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <TypeBadge type={view.card.primaryType} />
          {view.card.secondaryType && <TypeBadge type={view.card.secondaryType} />}
          <RarityStars rarity={view.card.rarity} withLabel />
          <span className="text-white/50">· carte {view.card.cardNumber}</span>
        </div>
        <p className="mt-2 text-sm">
          Capacité : <b>{view.ability.name}</b> — {view.ability.effectText} <span className="text-white/60">(inspirée de : {view.ability.inspiration.toLowerCase()})</span>
        </p>
        <details className="mt-2 text-xs text-white/60">
          <summary className="cursor-pointer">Comment c’est calculé</summary>
          <p className="mt-1">
            Types : règle « {rule.name === '*' ? 'par défaut' : rule.name} » ({rule.why}). Rareté : selon le nombre mondial d’observations iNaturalist (
            {s.observationsCount?.toLocaleString('fr-FR') ?? 'inconnu'}) — plus un animal est rarement observé, plus sa carte est rare. Les valeurs sont figées à la création de la carte.
          </p>
        </details>
      </Section>

      <Section title="Mes observations">
        {mine.length === 0 ? (
          <p className="text-sm text-white/60">Tu n’as pas encore observé cet animal.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {mine.map((o) => (
              <li key={o.id}>
                <Link to={`/observations/${o.id}`} className="block rounded-lg px-2 py-2 text-sm hover:bg-white/5">
                  {formatDate(o.observedAt)} · {s.sensitive ? 'lieu masqué' : (o.locationLabel ?? 'lieu non renseigné')} · {STATUS_LABELS[o.identificationStatus]}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Sources">
        <ul className="flex flex-col gap-2 text-sm">
          {s.sourceReferences.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-moss-300 underline">
                {r.label} <ExternalLink size={14} aria-hidden="true" />
              </a>
              <span className="block text-xs text-white/50">{r.accessedAt ? `Consulté le ${formatDate(r.accessedAt)}` : 'Lien de recherche, non consulté automatiquement'}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface p-4">
      <h2 className="mb-2 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode | undefined }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-2 py-1 text-sm">
      <span className="text-white/60">{label}</span>
      <span className={value ? '' : 'text-white/40'}>{value || NA}</span>
    </div>
  );
}

function MyPhotos({ observations }: { observations: Observation[] }) {
  const ids = observations.flatMap((o) => o.photoIds).slice(0, 6);
  if (ids.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs text-white/60">Tes photos (privées, sur cet appareil)</p>
      <div className="grid grid-cols-3 gap-2">
        {ids.map((id) => (
          <Thumb key={id} id={id} />
        ))}
      </div>
    </div>
  );
}

function Thumb({ id }: { id: string }) {
  const url = usePhotoUrl(id);
  return url ? <img src={url} alt="Ta photo d’observation" className="aspect-square w-full rounded-lg object-cover" loading="lazy" /> : <div className="aspect-square rounded-lg bg-white/5" />;
}
