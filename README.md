# Animodex

Application web (PWA) de découverte naturaliste : on observe de vrais animaux, on les place sur une carte et on collectionne leurs cartes Animodex.

**Ouvrir l'application : https://ciccio743.github.io/Animodex/**

## Contenu du dépôt

- `index.html` : l'application complète en un seul fichier, publiée par GitHub Pages (branche `main`, dossier racine). Ne pas le modifier à la main : il est généré.
- `app/` : le code source (React + TypeScript + Vite), la documentation (`app/docs/`) et les tests.

## Mettre à jour l'application

```bash
cd app
npm ci
npm test                # tests unitaires
npm run build:single    # génère app/dist-single/index.html
cp dist-single/index.html ../index.html
```

Puis commit et push sur `main` : le site se met à jour en 1 à 2 minutes.
