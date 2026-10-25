# Modèle de données (base IndexedDB v2, sauvegarde v2)

Types TypeScript de référence : `src/domain/models.ts`. Schémas de validation : `src/domain/validation.ts`.

## Species (store `species`, index `byGroup`)
Copie locale d'une fiche issue d'iNaturalist. `id` (`inat-{taxonId}`), `cardNumber` (`AX-{taxonId}`), `legacyCardNumbers?`, `inatTaxonId`, `gbifUsageKey?`, `scientificName`, `rank`, `frenchName?`, `commonNames[]`, `group` (bird, mammal, reptile, amphibian, fish, insect, other_invertebrate), `taxonomy {kingdom?, phylum?, class?, order?, family?, genus?}`, `description? {text, source, url, license}`, champs facultatifs non fournis par la source (physique, régime, habitats…), `conservationStatus? {code, category?, authority?, placeName?, sourceUrl}`, `observationsCount?`, `media[]`, `sensitive`, `sourceReferences[] {source, url, accessedAt}`, `fetchedAt`, `lastVerifiedAt`.

## SpeciesMedia
`id, url, thumbnailUrl, creator, license, attribution, source, sourceUrl, mediaType, verificationStatus` (`source_license` : licence telle que déclarée par la source). 6 photos au plus par espèce.

## ApiCache (store `apiCache`)
`key` (ex. `area:place:123:m10:all`), `fetchedAt`, `value`. Listes de zone (7 jours) ; les fiches d'espèce sont rafraîchies au bout de 30 jours.

## AnimodexCard (store `cards`)
`id, speciesId, cardNumber, primaryType, secondaryType?, rarity, baseHp, abilityId, visualVariant, rulesVersion, createdAt, updatedAt`.

## Observation (store `observations`)
`id, speciesId?` (absent si « à identifier »), `observedAt` (ISO), `latitude?`, `longitude?`, `locationPrecision` (`exact` | `approximate` | `none`), `locationLabel?`, `photoIds[]`, `identificationStatus` (`confirmed` | `uncertain` | `to_identify`), `identificationConfidence?` (0–1, uniquement si fourni par un service), `identificationSource` (`manual` | provider id), `notes?`, `createdAt, updatedAt`.

Règles : latitude et longitude vont ensemble ; `precision = none` ⇒ pas de coordonnées ; `confirmed`/`uncertain` ⇒ `speciesId` requis ; date non future.

## Photo (store `photos`)
`id, observationId, blob, thumbBlob, mimeType, width, height, source` (`camera` | `import`), `createdAt`.

## Ability (catalogue) — voir `src/data/abilities.ts`
## UserProgress — dérivé (non stocké) : `level, totalXp, unlockedBadges, statistics`.
## Settings (store `settings`)
`id, locationPermission, defaultLocationPrecision, units, language, reducedMotion, textScale, dataStorageMode`.
## Meta (store `meta`)
`schemaVersion`, `lastBackupAt`, `lastImportAt`, `lastArea` (dernière zone de découverte choisie).

## Sauvegarde (`animodex-backup`, `schemaVersion: 2`)
`data { observations, photos (base64), cards, species, settings }`. Le catalogue d'espèces est inclus pour qu'une restauration fonctionne hors ligne. Les fichiers v1 (ancien catalogue manuel) sont refusés avec un message clair. À la fusion, la fiche d'espèce la plus récente (`fetchedAt`) l'emporte.
