# Animodex

Application web mobile (PWA installable sur iPhone) de découverte naturaliste gamifiée : on observe de vrais animaux, on enregistre la rencontre, on obtient la carte Animodex de l'espèce et on apprend à la connaître.

> **Règle d'or : on ne capture jamais les animaux, on capture le souvenir de leur découverte.**

État : **Phase 1 livrée**, catalogue vierge alimenté par iNaturalist et GBIF (sans compte ni clé). Voir [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Prérequis

- Node.js 20 ou plus récent (testé avec Node 22), npm 10.

## Installation et lancement local

```bash
npm install
npm run dev          # http://localhost:5173
```

Pour tester sur un iPhone du même réseau Wi-Fi : `npm run dev -- --host`, puis ouvrir l'adresse affichée dans Safari. (Le service worker et l'installation PWA exigent HTTPS hors `localhost` : utilisez le déploiement ci-dessous pour tester l'installation.)

## Build de production

```bash
npm run build        # vérification TypeScript + build dans dist/
npm run preview      # sert dist/ sur http://localhost:4173
```

## Tests

```bash
npm test             # Vitest : unitaires + intégration (IndexedDB simulée)
npm run test:e2e     # Playwright : parcours sur un iPhone 13 émulé (Chromium) ; lance lui-même `npm run preview` → faire `npm run build` avant
```

Résultats réels : [docs/TESTING.md](docs/TESTING.md).

## Mettre l'application sur GitHub Pages (un seul fichier)

```bash
npm run build:single   # crée dist-single/index.html (tout est dedans)
```

1. Dans un dépôt GitHub, déposer `index.html` à la racine (Add file → Upload files).
2. Settings → Pages → Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Ouvrir `https://<compte>.github.io/<dépôt>/` dans Safari, puis Partager → Sur l'écran d'accueil.

Cette version n'a pas de service worker : il faut du réseau pour ouvrir l'app (les données restent sur l'appareil). Pour le mode hors ligne complet, déployer plutôt le dossier `dist/` (ci-dessous) sur un hébergement à la racine d'un domaine.

## Déploiement

`dist/` est un site statique. Toute plateforme HTTPS convient (Netlify, Vercel, Cloudflare Pages, GitHub Pages…). Une seule contrainte : rediriger toutes les routes inconnues vers `/index.html` (application monopage).

- Netlify : fichier `public/_redirects` contenant `/* /index.html 200`.
- Vercel : `vercel.json` avec `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.

Installation sur iPhone : ouvrir l'URL dans **Safari** → Partager → **Sur l'écran d'accueil**.

## Variables d'environnement

Aucune n'est nécessaire. Voir [.env.example](.env.example) pour les phases suivantes. Ne jamais mettre de clé secrète dans une variable `VITE_*` (elles sont visibles dans le navigateur).

## API et clés

| Service | Phase | Clé | Statut |
|---|---|---|---|
| Tuiles OpenStreetMap (via Leaflet) | 2 | non (attribution obligatoire, usage modéré) | branchée |
| Nominatim (recherche de lieu) | 2 | non (1 requête/s max, sur action) | branchée |
| iNaturalist API v1 | 3 | non (lecture, ~1 req/s) | branchée, testée avec réponses simulées |
| GBIF API (`species/match`) | 3 | non | branchée, testée avec réponses simulées |
| Liste rouge UICN API | 3 | **oui** (jeton, via backend) | à faire |
| Identification d'espèces par image | 4 | **oui** selon le fournisseur (via backend uniquement) | à choisir |
| Supabase | 6 | URL + clé anon publique ; clé service côté serveur seulement | à faire |

## Documentation

- [Plan d'implémentation et état des phases](docs/IMPLEMENTATION_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Modèle de données](docs/DATA_MODEL.md)
- [Règles de jeu](docs/GAME_RULES.md)
- [Sources de données et licences](docs/SOURCES_AND_LICENSES.md)
- [Tests et résultats](docs/TESTING.md)

## Structure

```
src/domain        règles métier pures (types, rareté, PV, capacités, cartes, progression, XP, validation)
src/data          capacités de jeu (29) ; aucune fiche d'espèce embarquée
src/db            IndexedDB + migrations
src/repositories  accès aux données
src/services      catalogue + connecteurs iNaturalist/GBIF, observations, sauvegarde JSON/CSV, photos, export PNG
src/features      écrans (home, discovery, collection, cards, species, observations, map, profile)
src/components    UI réutilisable
tests/e2e         parcours Playwright
```
