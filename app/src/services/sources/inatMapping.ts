import type { ConservationCategory, Species, SpeciesMedia, TaxonGroup, TaxonomyPath } from '../../domain/models';
import type { InatTaxon } from './inatSchemas';

export const INAT_SITE = 'https://www.inaturalist.org';

/** Licences de photos acceptées. Les licences NC (non commerciales) conviennent à l'usage familial actuel ;
 *  à retirer avant toute exploitation commerciale (voir docs/SOURCES_AND_LICENSES.md). */
export const ALLOWED_PHOTO_LICENSES = ['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa', 'cc-by-nd', 'cc-by-nc-nd'] as const;

export const LICENSE_LABELS: Record<string, string> = {
  cc0: 'CC0',
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nd': 'CC BY-ND',
  'cc-by-nc-nd': 'CC BY-NC-ND',
};

const NON_ANIMAL = new Set(['Plantae', 'Fungi', 'Chromista', 'Protozoa', 'Bacteria', 'Archaea', 'Viruses']);

const ICONIC_GROUP: Record<string, TaxonGroup> = {
  Aves: 'bird',
  Mammalia: 'mammal',
  Reptilia: 'reptile',
  Amphibia: 'amphibian',
  Actinopterygii: 'fish',
  Insecta: 'insect',
  Arachnida: 'other_invertebrate',
  Mollusca: 'other_invertebrate',
};
const FISH_CLASSES = new Set(['Actinopterygii', 'Elasmobranchii', 'Chondrichthyes', 'Sarcopterygii', 'Myxini', 'Petromyzonti', 'Holocephali']);

export function isAnimal(t: Pick<InatTaxon, 'iconic_taxon_name'>): boolean {
  return !!t.iconic_taxon_name && !NON_ANIMAL.has(t.iconic_taxon_name);
}

export function groupOf(t: InatTaxon, taxonomy: TaxonomyPath): TaxonGroup | undefined {
  if (!isAnimal(t)) return undefined;
  const direct = t.iconic_taxon_name ? ICONIC_GROUP[t.iconic_taxon_name] : undefined;
  if (direct) return direct;
  if (taxonomy.class && FISH_CLASSES.has(taxonomy.class)) return 'fish';
  return 'other_invertebrate';
}

export function taxonomyOf(t: InatTaxon): TaxonomyPath {
  const path: TaxonomyPath = {};
  for (const a of t.ancestors ?? []) {
    if (a.rank === 'kingdom' || a.rank === 'phylum' || a.rank === 'class' || a.rank === 'order' || a.rank === 'family' || a.rank === 'genus') path[a.rank] = a.name;
  }
  return path;
}

/** Taille d'image iNaturalist : les URL suivent le motif …/square.jpg, medium.jpg, large.jpg. */
export function photoSize(url: string, size: 'square' | 'small' | 'medium' | 'large'): string {
  return url.replace(/\/(square|small|medium|large|original)\.(jpe?g|png)/i, `/${size}.$2`);
}

export function mediaOf(t: InatTaxon, speciesId: string): SpeciesMedia[] {
  const photos = [...(t.taxon_photos ?? []).map((p) => p.photo), ...(t.default_photo ? [t.default_photo] : [])];
  const seen = new Set<number>();
  const out: SpeciesMedia[] = [];
  for (const p of photos) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const license = p.license_code?.toLowerCase();
    const base = p.url ?? p.medium_url ?? p.square_url;
    // Pas de licence = tous droits réservés : photo écartée.
    if (!license || !(ALLOWED_PHOTO_LICENSES as readonly string[]).includes(license) || !base || !p.attribution) continue;
    out.push({
      id: `inat-photo-${p.id}`,
      speciesId,
      url: photoSize(base, 'medium'),
      thumbnailUrl: photoSize(base, 'small'),
      creator: p.attribution.replace(/^\(c\)\s*/i, '').replace(/,.*$/, '').trim() || undefined,
      license: LICENSE_LABELS[license] ?? license.toUpperCase(),
      attribution: p.attribution,
      source: 'iNaturalist',
      sourceUrl: `${INAT_SITE}/photos/${p.id}`,
      mediaType: 'photo',
      verificationStatus: 'source_license',
    });
    if (out.length >= 6) break;
  }
  return out;
}

const IUCN_CODES: Record<number, ConservationCategory> = { 5: 'NE', 10: 'LC', 20: 'NT', 30: 'VU', 40: 'EN', 50: 'CR', 60: 'EW', 70: 'EX' };

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convertit un taxon iNaturalist (réponse détaillée) en espèce du catalogue.
 * Renvoie undefined si le taxon n'est pas un animal ou n'est pas une espèce.
 */
export function speciesFromInat(t: InatTaxon, now: Date = new Date()): Species | undefined {
  if (t.rank !== 'species') return undefined;
  const taxonomy = taxonomyOf(t);
  const group = groupOf(t, taxonomy);
  if (!group) return undefined;
  const id = `inat-${t.id}`;
  const fetchedAt = now.toISOString();
  const cs = t.conservation_status;
  const category = cs?.iucn !== undefined ? IUCN_CODES[cs.iucn] : undefined;
  const taxonUrl = `${INAT_SITE}/taxa/${t.id}`;
  const summary = t.wikipedia_summary ? stripHtml(t.wikipedia_summary) : '';
  return {
    id,
    cardNumber: `AX-${t.id}`,
    inatTaxonId: t.id,
    scientificName: t.name,
    rank: t.rank,
    frenchName: t.preferred_common_name || undefined,
    commonNames: t.english_common_name && t.english_common_name !== t.preferred_common_name ? [t.english_common_name] : [],
    group,
    taxonomy,
    description: summary
      ? { text: summary, source: 'Wikipédia (via iNaturalist)', url: t.wikipedia_url, license: 'CC BY-SA' }
      : undefined,
    habitats: [],
    adaptations: [],
    conservationStatus:
      cs?.status
        ? {
            code: cs.status.toUpperCase(),
            category,
            authority: cs.authority,
            placeName: cs.place?.display_name ?? cs.place?.name,
            sourceUrl: taxonUrl,
          }
        : undefined,
    observationsCount: t.observations_count,
    media: mediaOf(t, id),
    sensitive: !!t.threatened || (cs?.iucn !== undefined && cs.iucn >= 30 && cs.iucn <= 50),
    sourceReferences: [
      { label: 'iNaturalist — taxon, noms, photos, statut', url: taxonUrl, fields: ['taxonomy', 'names', 'media', 'conservationStatus'], accessedAt: fetchedAt },
      { label: 'GBIF — taxonomie et répartition', url: `https://www.gbif.org/species/search?q=${encodeURIComponent(t.name)}`, fields: ['taxonomy', 'distribution'] },
      ...(t.wikipedia_url ? [{ label: 'Wikipédia — résumé (CC BY-SA)', url: t.wikipedia_url, fields: ['description'], accessedAt: fetchedAt }] : []),
    ],
    fetchedAt,
    lastVerifiedAt: fetchedAt,
  };
}

/** Résumé léger d'un taxon (listes de suggestions), sans le stocker dans le catalogue. */
export interface TaxonSummary {
  taxonId: number;
  scientificName: string;
  frenchName?: string;
  group: TaxonGroup;
  photo?: SpeciesMedia;
  observationsCount?: number;
}

export function summaryFromInat(t: InatTaxon): TaxonSummary | undefined {
  if (t.rank !== 'species' || !isAnimal(t)) return undefined;
  const group = groupOf(t, taxonomyOf(t));
  if (!group) return undefined;
  return {
    taxonId: t.id,
    scientificName: t.name,
    frenchName: t.preferred_common_name || undefined,
    group,
    photo: mediaOf({ ...t, taxon_photos: undefined }, `inat-${t.id}`)[0],
    observationsCount: t.observations_count,
  };
}
