# Animodex — Architecture

## Principes

1. **Local d'abord** : tout fonctionne sans compte ni réseau. IndexedDB est la source de vérité sur l'appareil.
2. **Séparation stricte** : règles métier pures (`domain`), stockage (`db`, `repositories`), réseau (`services/sources`), interface (`features`, `components`).
3. **Espèce ≠ carte ≠ observation** :
   - `Species` : donnée naturaliste copiée depuis iNaturalist (catalogue vierge au départ), avec provenance et date.
   - `AnimodexCard` : objet de jeu, un par espèce, créé une seule fois, numéro stable.
   - `Observation` : rencontre réelle datée, lieu facultatif, statut d'identification.
4. **Rien d'inventé** : champ inconnu = absent (affiché « Donnée non disponible ») ; pas de coordonnées par défaut ; pas de photo de substitution présentée comme réelle.
5. **Déterminisme** : type, rareté, PV, capacité et numéro dérivent de règles versionnées (`GAME_RULES_VERSION`) et des attributs de l'espèce, jamais du hasard ou de l'ordre d'affichage.

## Pile

| Besoin | Choix |
|---|---|
| UI | React 19 + TypeScript, Vite 8 |
| Styles | Tailwind CSS 4 + jetons CSS (`src/styles/`) |
| Routage | React Router 7 (mode déclaratif) |
| Stockage | IndexedDB via `idb`, migrations versionnées |
| Validation | Zod (import de sauvegarde, observations) |
| Export image | `html-to-image` (PNG du nœud de la carte seule) |
| PWA | `vite-plugin-pwa` (Workbox, precache, invite de mise à jour) |
| Carte (Phase 2) | Leaflet + tuiles OpenStreetMap avec attribution |
| Tests | Vitest + Testing Library + fake-indexeddb ; Playwright (Chromium) |
| Backend futur | Supabase (Postgres, Auth, Storage, RLS) — optionnel |

## Arborescence

```
src/
  app/            App, routes, navigation, mise en page
  components/     UI réutilisable (TypeIcon, RarityStars, Sheet, EmptyState…)
  data/           capacités de jeu
  domain/         modèles + règles pures (types, rareté, PV, capacités, cartes, progression, XP, validation)
  db/             schéma IndexedDB, migrations
  repositories/   accès aux données (observations, photos, cartes, réglages, méta)
  services/       catalogue (cache + sources), observations, sauvegarde JSON, photos, export PNG
    sources/      connecteurs HTTP : iNaturalist, GBIF (limite de débit, délai, erreurs typées, Zod)
  features/
    home/ discovery/ collection/ cards/ species/ observations/ map/ profile/
  hooks/          hooks React (données réactives)
  styles/         design system
tests/e2e/        parcours Playwright
docs/             documentation
```

## Flux principal : enregistrer une observation

1. L'utilisateur choisit une espèce (recherche manuelle) ou laisse « À identifier ».
2. Formulaire : date, statut (`confirmed` / `uncertain` / `to_identify`), lieu textuel facultatif, photo facultative (redimensionnée localement), notes.
3. `ObservationService.create` valide (Zod + règles), enregistre photo(s) et observation dans une transaction.
4. Si statut `confirmed` et aucune carte pour l'espèce : `generateCard()` crée la carte (règles déterministes) → écran de révélation.
5. La collection, la progression et l'XP sont **dérivées** des observations à chaque lecture (pas de compteur à désynchroniser).

## Flux : ajouter une espèce au catalogue

1. Recherche (formulaire d'observation) ou liste d'une zone (Découvrir) → iNaturalist.
2. `catalogService.ensureSpecies` : fiche locale si elle a moins de 30 jours, sinon `/taxa/{id}` → conversion (`inatMapping`) → correspondance GBIF stricte → `species` dans IndexedDB.
3. Hors ligne ou erreur : la fiche locale périmée est utilisée avec mention ; sinon message clair et bouton « Réessayer ».

## Stockage IndexedDB (`animodex`, version de schéma 2)

| Store | Clé | Index |
|---|---|---|
| `observations` | `id` | `speciesId`, `observedAt` |
| `photos` | `id` | `observationId` |
| `cards` | `id` | `speciesId` (unique), `cardNumber` (unique) |
| `settings` | `id` (= `"settings"`) | — |
| `meta` | `key` | — |
| `species` | `id` | `byGroup` |
| `apiCache` | `key` | — |

Suppression d'une observation : supprime ses photos ; la carte de l'espèce est conservée (elle redevient « non débloquée » dans l'affichage si plus aucune observation confirmée ne la soutient).

## Sauvegarde

Format `animodex-backup`, `schemaVersion` entier. Photos encodées en base64. Import : validation Zod complète → prévisualisation (ajouts, mises à jour, conflits) → fusion ou remplacement confirmé, dans **une seule transaction** (échec = aucune modification).

## Sécurité et vie privée

- Aucune clé secrète dans le frontend ; les futurs fournisseurs à clé privée passeront par une fonction backend.
- Seules des requêtes de lecture partent vers iNaturalist et GBIF (nom recherché, lieu, ou position arrondie à ~1 km sur action explicite). Observations et photos restent sur l'appareil.
- Géolocalisation : à la demande de l'utilisateur, suivie automatiquement sur la carte et dans le formulaire (réglage désactivable). La position n'est ni envoyée ni enregistrée tant qu'une observation n'est pas sauvegardée ; coordonnées privées (sur l'appareil), espèces sensibles floutées à l'affichage.
