import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Binoculars, ChevronRight, CloudDownload, RefreshCw, Shuffle, X } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Notice } from '../../components/Notice';
import { RarityStars } from '../../components/RarityStars';
import { EmptyState } from '../../components/EmptyState';
import { GROUP_ICON } from '../../components/typeTheme';
import { GROUP_LABELS, RARITY_LABELS } from '../../domain/labels';
import { TAXON_GROUPS, displayName, type Rarity, type TaxonGroup } from '../../domain/models';
import { areaConfidence, matchesQuery, pickSurprise, type SurpriseResult } from '../../domain/discovery';
import { SURPRISE_WEIGHTS } from '../../domain/gameConfig';
import { assignRarity } from '../../domain/rarity';
import { useData, useOnline } from '../../hooks/useData';
import { downloadAreaPack, getAreaSpecies, PACK_SIZE, type AreaResult } from '../../services/catalogService';
import type { DiscoveryArea } from '../../services/sources/inaturalist';
import { apiErrorMessage } from '../../services/sources/http';
import { getMeta, setMeta } from '../../repositories/settings';
import { formatDateTime } from '../../utils/format';
import { AreaPicker } from './AreaPicker';

/** Élément affichable : suggestion de zone ou espèce du catalogue local. */
interface Item {
  taxonId: number;
  name: string;
  scientificName: string;
  group: TaxonGroup;
  thumb?: string;
  thumbCredit?: string;
  rarity: Rarity;
  count?: number;
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const { db, progress, catalog } = useData();
  const online = useOnline();
  const [area, setArea] = useState<DiscoveryArea>();
  const [group, setGroup] = useState<TaxonGroup>();
  const [thisMonth, setThisMonth] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AreaResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [surprise, setSurprise] = useState<SurpriseResult<Item>>();
  const [pack, setPack] = useState<{ done: number; total: number; saved?: number; error?: string }>();
  const month = thisMonth ? new Date().getMonth() + 1 : undefined;

  // Zone mémorisée (libellé + coordonnées arrondies seulement).
  useEffect(() => {
    if (!db) return;
    void getMeta(db, 'lastArea').then((v) => {
      if (typeof v === 'string') {
        try {
          setArea((a) => a ?? (JSON.parse(v) as DiscoveryArea));
        } catch {
          /* valeur ignorée */
        }
      }
    });
  }, [db]);

  const chooseArea = (a: DiscoveryArea) => {
    setArea(a);
    if (db) void setMeta(db, 'lastArea', JSON.stringify(a));
  };

  const load = useCallback(
    async (force = false) => {
      if (!db || !area) return;
      setLoading(true);
      setError(undefined);
      try {
        setResult(await getAreaSpecies(db, { area, month, group }, { force }));
      } catch (e) {
        setResult(undefined);
        setError(apiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    },
    [db, area, month, group],
  );
  useEffect(() => void load(), [load]);

  const items: Item[] = useMemo(() => {
    if (area && result)
      return result.items.map(({ summary, count }) => ({
        taxonId: summary.taxonId,
        name: displayName(summary),
        scientificName: summary.scientificName,
        group: summary.group,
        thumb: summary.photo?.thumbnailUrl,
        thumbCredit: summary.photo && `${summary.photo.creator ?? 'iNaturalist'} · ${summary.photo.license}`,
        rarity: assignRarity(summary),
        count,
      }));
    return catalog
      .filter((s) => !group || s.group === group)
      .map((s) => ({
        taxonId: s.inatTaxonId,
        name: displayName(s),
        scientificName: s.scientificName,
        group: s.group,
        thumb: s.media[0]?.thumbnailUrl,
        thumbCredit: s.media[0] && `${s.media[0].creator ?? 'iNaturalist'} · ${s.media[0].license}`,
        rarity: assignRarity(s),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [area, result, catalog, group]);

  const visible = useMemo(() => (query.trim() ? items.filter((i) => matchesQuery([i.name, i.scientificName], query)) : items), [items, query]);

  useEffect(() => {
    if (params.get('surprise') !== '1' || loading) return;
    if (area && !result && !error) return; // attendre la liste de la zone
    setSurprise(pickSurprise(visible, (i) => i.rarity));
    setParams({}, { replace: true });
  }, [params, setParams, loading, area, result, error, visible]);

  async function onPack() {
    if (!db || !area) return;
    setPack({ done: 0, total: 0 });
    try {
      const saved = await downloadAreaPack(db, area, (done, total) => setPack({ done, total }));
      setPack((p) => ({ done: p?.total ?? 0, total: p?.total ?? 0, saved }));
    } catch (e) {
      setPack({ done: 0, total: 0, error: apiErrorMessage(e) });
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <PageHeader title="Partir à la découverte" subtitle="Choisis une zone, regarde quels animaux y ont été observés, puis pars à leur recherche." />

      <AreaPicker area={area} onChange={chooseArea} />

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrer par groupe">
        <button type="button" className="chip" aria-pressed={!group} onClick={() => setGroup(undefined)}>
          Tous
        </button>
        {TAXON_GROUPS.map((g) => (
          <button key={g} type="button" className="chip" aria-pressed={group === g} onClick={() => setGroup(group === g ? undefined : g)}>
            {GROUP_LABELS[g]}
          </button>
        ))}
      </div>
      {area && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-moss-500" checked={thisMonth} onChange={(e) => setThisMonth(e.target.checked)} />
          Seulement les observations faites en {MONTHS[new Date().getMonth()]} (saisonnalité)
        </label>
      )}

      {area ? (
        <Notice>
          Liste fournie par <b>iNaturalist</b> : espèces animales ayant des observations validées (qualité « recherche ») dans cette zone. Elles ne sont pas forcément visibles
          aujourd’hui : ce sont des pistes, pas des promesses.
          {result && (
            <span className="mt-1 block text-xs opacity-80" data-testid="area-source">
              Données du {formatDateTime(result.fetchedAt)}
              {result.stale ? ' — cache ancien, connexion indisponible' : result.fromCache ? ' (cache local)' : ''} · {result.totalSpecies} espèces au total dans la zone.
            </span>
          )}
        </Notice>
      ) : (
        <Notice>
          Choisis une zone pour voir les animaux observés autour. En attendant, voici ton catalogue local ({catalog.length} espèce{catalog.length > 1 ? 's' : ''}).
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-secondary text-sm" onClick={() => setSurprise(pickSurprise(visible, (i) => i.rarity))} disabled={visible.length === 0}>
          <Shuffle size={18} aria-hidden="true" /> Découverte surprise
        </button>
        {area ? (
          <button type="button" className="btn btn-secondary text-sm" onClick={() => void onPack()} disabled={!online || (!!pack && !pack.saved && !pack.error)}>
            <CloudDownload size={18} aria-hidden="true" /> Préparer hors ligne
          </button>
        ) : (
          <span />
        )}
      </div>
      {pack && (
        <p role="status" className={`text-sm ${pack.error ? 'text-red-300' : 'text-moss-300'}`}>
          {pack.error
            ? pack.error
            : pack.saved !== undefined
              ? `${pack.saved} fiches enregistrées dans ton catalogue, consultables hors ligne (photos : celles déjà affichées).`
              : `Téléchargement des fiches… ${pack.done}/${pack.total || PACK_SIZE}`}
        </p>
      )}

      {surprise && <SurpriseCard result={surprise} discovered={progress.discoveredSpeciesIds.has(`inat-${surprise.item.taxonId}`)} onClose={() => setSurprise(undefined)} />}

      <label className="block">
        <span className="sr-only">Filtrer la liste</span>
        <input type="search" className="field" placeholder="Filtrer la liste par nom…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-red-500/15 p-3 text-sm text-red-100 ring-1 ring-red-400/30">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary min-h-10 text-sm" onClick={() => void load(true)}>
            <RefreshCw size={16} aria-hidden="true" /> Réessayer
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-sm text-white/60" role="status">
          Recherche des espèces observées dans la zone…
        </p>
      ) : visible.length === 0 ? (
        !error && (
          <EmptyState icon={Binoculars} title={area ? 'Aucune espèce trouvée' : 'Catalogue vide'}>
            {area ? 'Essaie un rayon plus grand, un autre groupe ou toute l’année.' : 'Choisis une zone ci-dessus pour commencer.'}
          </EmptyState>
        )
      ) : (
        <ul className="flex flex-col gap-2" data-testid="discover-list">
          {visible.map((i) => (
            <Row key={i.taxonId} item={i} status={progress.discoveredSpeciesIds.has(`inat-${i.taxonId}`) ? 'found' : progress.pendingSpeciesIds.has(`inat-${i.taxonId}`) ? 'pending' : 'new'} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ item, status }: { item: Item; status: 'found' | 'pending' | 'new' }) {
  const Icon = GROUP_ICON[item.group];
  const conf = item.count !== undefined ? areaConfidence(item.count) : undefined;
  return (
    <li className="surface p-3">
      <Link to={`/especes/inat-${item.taxonId}`} className="flex items-center gap-3">
        <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5">
          {item.thumb ? (
            <img src={item.thumb} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" title={item.thumbCredit} />
          ) : (
            <Icon size={26} className="text-white/70" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{item.name}</span>
            {status === 'found' && <span className="rounded-full bg-moss-300 px-2 text-xs font-bold text-black">Découverte ✓</span>}
            {status === 'pending' && <span className="rounded-full bg-amber-400 px-2 text-xs font-bold text-black">À confirmer</span>}
          </span>
          <span className="block truncate text-xs italic text-white/60">{item.scientificName}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
            <RarityStars rarity={item.rarity} size={11} />
            <span>{GROUP_LABELS[item.group]}</span>
            {conf && (
              <span>
                · {item.count} obs. — {conf.label}
              </span>
            )}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-white/40" aria-hidden="true" />
      </Link>
    </li>
  );
}

function SurpriseCard({ result, discovered, onClose }: { result: SurpriseResult<Item>; discovered: boolean; onClose: () => void }) {
  const { item, rarity, probability, candidates } = result;
  return (
    <section className="surface-strong relative p-4 ax-reveal-glow" aria-labelledby="surprise-title" aria-live="polite">
      <button type="button" className="btn btn-ghost absolute right-1 top-1 min-h-10 px-3" onClick={onClose} aria-label="Fermer la découverte surprise">
        <X size={18} />
      </button>
      <p className="text-xs uppercase tracking-wide text-gold-300">Découverte surprise — animal à rechercher</p>
      <div className="mt-2 flex gap-3">
        {item.thumb && <img src={item.thumb} alt="" className="h-20 w-20 rounded-xl object-cover" referrerPolicy="no-referrer" />}
        <div>
          <h2 id="surprise-title" className="font-display text-2xl font-bold">
            {item.name}
          </h2>
          <p className="text-sm italic text-white/60">{item.scientificName}</p>
          {item.thumbCredit && <p className="text-[11px] text-white/50">Photo : {item.thumbCredit}</p>}
        </div>
      </div>
      {item.count !== undefined && <p className="mt-2 text-sm">{item.count} observations validées dans la zone (iNaturalist).</p>}
      <details className="mt-3 text-xs text-white/60">
        <summary className="cursor-pointer">Pourquoi cet animal ?</summary>
        <p className="mt-1">
          Tiré au hasard parmi {candidates} espèce{candidates > 1 ? 's' : ''} de la liste affichée, avec des poids par rareté : Commun {SURPRISE_WEIGHTS.common}, Rare {SURPRISE_WEIGHTS.rare},
          Épique {SURPRISE_WEIGHTS.epic}, Légendaire {SURPRISE_WEIGHTS.legendary}. Chance de ce tirage : {(probability * 100).toFixed(1)} % ({RARITY_LABELS[rarity]}). Ce tirage ne
          débloque aucune carte : il faut une observation réelle.
        </p>
      </details>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to={`/especes/inat-${item.taxonId}`} className="btn btn-secondary">
          Voir la fiche
        </Link>
        <Link to={`/observations/nouvelle?taxon=${item.taxonId}`} className="btn btn-primary">
          {discovered ? 'Je l’ai revu' : 'Je l’ai vu !'}
        </Link>
      </div>
    </section>
  );
}
