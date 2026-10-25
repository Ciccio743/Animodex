import { z } from 'zod';

/**
 * Schémas de validation des réponses de l'API iNaturalist v1 (https://api.inaturalist.org/v1/docs/).
 * Volontairement tolérants (champs optionnels, champs inconnus ignorés) : la source peut ajouter des champs,
 * mais une réponse sans les champs indispensables est rejetée.
 */
const nullish = <T extends z.ZodTypeAny>(t: T) => t.nullish().transform((v) => v ?? undefined);

export const inatPhotoSchema = z.object({
  id: z.number(),
  license_code: nullish(z.string()),
  attribution: nullish(z.string()),
  url: nullish(z.string()),
  square_url: nullish(z.string()),
  medium_url: nullish(z.string()),
});

export const inatConservationSchema = z.object({
  status: nullish(z.string()),
  authority: nullish(z.string()),
  iucn: nullish(z.number()),
  status_name: nullish(z.string()),
  place: nullish(z.object({ id: z.number(), name: nullish(z.string()), display_name: nullish(z.string()) })),
});

export const inatTaxonSchema = z.object({
  id: z.number(),
  name: z.string(),
  rank: z.string(),
  iconic_taxon_name: nullish(z.string()),
  preferred_common_name: nullish(z.string()),
  english_common_name: nullish(z.string()),
  observations_count: nullish(z.number()),
  threatened: nullish(z.boolean()),
  extinct: nullish(z.boolean()),
  is_active: nullish(z.boolean()),
  default_photo: nullish(inatPhotoSchema),
  wikipedia_url: nullish(z.string()),
  wikipedia_summary: nullish(z.string()),
  ancestors: nullish(z.array(z.object({ id: z.number(), name: z.string(), rank: z.string() }))),
  taxon_photos: nullish(z.array(z.object({ photo: inatPhotoSchema }))),
  conservation_status: nullish(inatConservationSchema),
});
export type InatTaxon = z.infer<typeof inatTaxonSchema>;

export const inatTaxaResponseSchema = z.object({
  total_results: z.number().optional(),
  results: z.array(inatTaxonSchema),
});

export const inatSpeciesCountsSchema = z.object({
  total_results: z.number().optional(),
  results: z.array(z.object({ count: z.number(), taxon: inatTaxonSchema })),
});

export const inatPlacesSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      display_name: nullish(z.string()),
      location: nullish(z.string()),
      place_type: nullish(z.number()),
    }),
  ),
});
export type InatPlace = z.infer<typeof inatPlacesSchema>['results'][number];
