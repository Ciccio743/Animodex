# Sources de données et licences

## Catalogue : vierge au départ, alimenté par des sources libres

Animodex ne contient **aucune fiche d'espèce rédigée à la main**. Le catalogue est vide à l'installation et se remplit à partir de sources publiques gratuites, consultées depuis le navigateur de l'utilisateur :

| Source | Usage | Clé | Licence des données |
|---|---|---|---|
| iNaturalist API v1 (`api.inaturalist.org`) | recherche d'espèces, fiche du taxon (taxonomie, noms français, statut de conservation, nombre d'observations, photos), espèces observées dans une zone | non | métadonnées ouvertes ; photos sous la licence choisie par chaque auteur |
| Résumé Wikipédia (fourni par iNaturalist) | description courte | non | CC BY-SA, source citée, HTML retiré |
| GBIF API (`species/match`) | lien vers la fiche GBIF (correspondance stricte seulement : EXACT, confiance ≥ 90) | non | CC0 / CC BY selon les jeux de données |

Bonnes pratiques respectées : environ 1 requête par seconde et par source, délai d'expiration, cache local (espèce 30 jours, liste de zone 7 jours, données périmées utilisées hors ligne avec mention), réponses validées (Zod), aucune extraction de page web.

Ce qui est affiché vient de la source, avec sa date de récupération (`fetchedAt`). Un champ que la source ne fournit pas (masse, longévité, régime…) est affiché « Donnée non disponible ». Les données ne sont jamais complétées par invention.

## Photos

- Seules les photos iNaturalist dont la licence est connue sont retenues : CC0, CC BY, CC BY-SA, et les variantes NC / ND (CC BY-NC, CC BY-NC-SA, CC BY-ND, CC BY-NC-ND). Les photos « tous droits réservés » ou sans licence sont ignorées.
- Chaque photo affiche : auteur, licence, source (« Photo de référence : … · CC BY-NC · iNaturalist »).
- **Note NC** : les licences « NC » (pas d'usage commercial) conviennent à un usage familial. Si Animodex devenait un produit commercial, il faudrait retirer ces photos (filtre `ALLOWED_PHOTO_LICENSES` dans `src/services/sources/inatMapping.ts`).
- La photo personnelle de l'utilisateur est toujours prioritaire sur la carte.
- Aucune image générée par IA n'est utilisée.

## Secteurs « Où le trouver ? »

Tuiles « grille » de l'API iNaturalist (`/v1/grid/{z}/{x}/{y}.png?taxon_id=…&verifiable=true`) : carrés colorés là où l'espèce a été observée. Ce sont des observations réelles, pas une aire de répartition : l'absence de carré ne prouve pas l'absence de l'animal (l'app le dit). Attribution iNaturalist affichée sur la carte.

## Espèces sensibles

Une espèce est sensible si iNaturalist la marque menacée, ou si son statut est entre VU et CR. Son lieu d'observation est masqué sur les cartes.

## Vie privée

Pour la liste d'une zone, la position n'est envoyée qu'après un appui sur « Utiliser ma position », arrondie à 2 décimales (environ 1 km). Une recherche par nom de lieu n'envoie que le texte saisi. Les observations et photos ne quittent jamais l'appareil.

## Polices et icônes

Inter et Fraunces : SIL Open Font License 1.1. Icônes : Lucide (ISC). Icône de l'application : création originale.

## Cartographie

Fond de carte « jeu » : tuiles vectorielles OpenFreeMap (`tiles.openfreemap.org`, schéma OpenMapTiles, données OpenStreetMap ; gratuit, sans clé ni inscription) affichées avec MapLibre GL et un style maison minimal (`src/features/map/gameStyle.ts` : eau, forêts, prés, grandes routes, noms de villes ; ni bâtiments, ni commerces, ni noms de rues). Attribution « OpenFreeMap © OpenMapTiles · données © contributeurs OpenStreetMap ». Fond de secours si le fond vectoriel ne charge pas en 8 s (ou sans WebGL) : tuiles OpenStreetMap standard (`tile.openstreetmap.org`). CARTO a été essayé puis retiré : il exige désormais une clé API ; seules les tuiles affichées sont gardées en cache (400 max, 14 jours), aucun téléchargement de zone. Recherche de lieu : Nominatim, 1 requête par seconde au plus, uniquement sur appui du bouton (pas d'autocomplétion). Si l'usage devenait important, passer à un fournisseur de tuiles dédié.

## Propriété intellectuelle

Animodex a sa propre identité graphique. Aucun logo, nom, illustration ou modèle graphique d'une franchise existante n'est reproduit.
