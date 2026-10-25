# Tests

## Commandes

```bash
npm test           # Vitest (unitaires + intégration)
npm run build      # requis avant les tests de parcours
npm run test:e2e   # Playwright (Chromium, iPhone 13 émulé)
```

## Résultats réels (2026-10-20, Node 22, environnement Linux)

- `npm run build` : réussi (TypeScript strict sans erreur, service worker généré).
- `npm test` : **10 fichiers, 85 tests réussis** (2026-10-25, dont validation du style de carte MapLibre).
- `npm run build:single` puis `npm run test:e2e` : **17 tests réussis** (2026-10-25, dont fond vectoriel affiché et bascule vers le fond OSM de secours ; dont « Où le trouver ? » et le bouton « + » ; l'échec ponctuel de l'export/import venait d'un fichier choisi avant l'ouverture de la base, corrigé ; 8 répétitions réussies), dont 2 parcours carte et 1 test du fichier unique servi dans un sous-dossier comme sur GitHub Pages.
- Fond de carte OSM, tuiles de secteurs iNaturalist et Nominatim sont aussi simulés (rendu réel du fond de carte non vérifié depuis l'environnement de développement : OpenFreeMap y est injoignable, la source vectorielle des tests est vide) dans les parcours (tuile = image de test).

## Réponses d'API simulées : à lire

Les API iNaturalist et GBIF **ne sont pas joignables** depuis l'environnement de développement. Les tests utilisent donc des réponses **écrites à la main** (`src/test/inatFixtures.ts`, `tests/e2e/inatApi.ts`), au format de la documentation publique de l'API. Les identifiants de taxon (900001…) sont volontairement fictifs pour ne pas être confondus avec de vraies données. **Le fonctionnement réel des connecteurs n'a pas été vérifié en conditions réelles** : à faire sur un appareil connecté (recherche « merle », zone « Lyon », fiche, photo, export PNG avec photo de référence).

## Couverture

Unitaires (`src/domain/*.test.ts`, `src/services/sources/*.test.ts`) : règles de type par taxon (famille > ordre > classe), rareté par nombre d'observations (et indépendance vis-à-vis du statut UICN), PV déterministes, capacités, création de carte et numéros `AX-{id}`, progression, XP, validation d'observation, filtres et découverte surprise (probabilités), conversion iNaturalist → Species (licences refusées, attribution, non-animaux rejetés, espèces sensibles), erreurs HTTP typées (hors ligne, délai, 429, réponse invalide), limitation de débit.

Service catalogue (`catalogService.test.ts`) : mise en cache d'une espèce, TTL, données périmées utilisées si la source échoue, liste de zone et pack hors ligne.

Intégration (`src/services/storage.integration.test.ts`, IndexedDB simulée par fake-indexeddb) : récupération d'une espèce, création d'observation et génération de carte unique, confirmation ultérieure, observation « à identifier », rejet sans écriture partielle, suppression avec photos, persistance après réouverture, export → restauration avec identifiants conservés, fusion (version la plus récente gagne, rien supprimé), fichiers invalides refusés sans toucher aux données, export CSV.

Composant (`AnimodexCardView.test.tsx`) : aperçu sans lieu ni photo inventée, lieu issu de la première observation réelle, lieu masqué pour une espèce sensible.

Parcours (`tests/e2e/journeys.spec.ts`) : ouverture avec catalogue vierge, navigation des 5 onglets, choix d'une zone et liste d'espèces, recherche d'espèce en ligne depuis le formulaire, erreur d'API (503) avec « Réessayer », liste de zone consultable hors ligne, enregistrement d'observation avec photo, affichage de la carte, ouverture de la fiche, nouvelle observation d'une espèce connue, conservation après rechargement, observation à identifier puis suppression, export JSON puis import dans un navigateur vierge (avec rejet d'un fichier invalide), export PNG, découverte surprise sans effet sur la collection, manifeste + service worker, consultation hors ligne.

## Non couvert pour l'instant

- Appels réels à iNaturalist / GBIF (voir plus haut).
- Export PNG d'une carte avec photo de référence : dépend des en-têtes CORS du stockage photo d'iNaturalist ; testé seulement avec une réponse simulée.
- Safari iOS réel : non disponible dans l'environnement ; tests faits sous Chromium avec émulation iPhone. À vérifier sur un appareil (installation PWA, appareil photo, stockage).
