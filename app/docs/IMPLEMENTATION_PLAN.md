# Animodex — Plan d'implémentation

Dernière mise à jour : 2026-10-20

## Constat initial

- Dépôt vide : aucun code existant à conserver. Aucun dépôt GitHub n'est relié au projet ; le code est construit localement puis copié dans les fichiers du projet.
- Node 22, npm, Chromium (Playwright) disponibles.
- **Les API GBIF, iNaturalist et Wikimedia Commons ne sont pas joignables depuis l'environnement de développement** (proxy 403). Conséquences :
  - les connecteurs tournent dans le navigateur de l'utilisateur (API publiques avec CORS) ;
  - leurs tests utilisent des réponses écrites à la main, clairement identifiées comme telles ; le fonctionnement réel reste à vérifier sur un appareil connecté.
- Aucune clé API n'est nécessaire.

## Changement de cap (2026-10-20, demande de Tommy)

Le catalogue de 30 fiches rédigées à la main est **supprimé**. Animodex part d'un catalogue vierge, alimenté par les sources libres (iNaturalist, résumé Wikipédia, GBIF). Une partie de la Phase 3 est donc avancée : connecteurs, cache avec TTL, photos attribuées, espèces d'une zone.

## Phases

| Phase | Contenu | Statut |
|---|---|---|
| 1 — Socle | React/TS/Vite, design system, navigation mobile, catalogue initial, cartes déterministes, fiches naturalistes, observations locales, IndexedDB, import/export JSON, PWA | **Livrée** (voir détail ci-dessous) |
| 2 — Carte et observations | Leaflet + OSM, géolocalisation consentie, recherche de lieu (Nominatim, avec limitation), marqueurs regroupés, filtres, précision de position, masquage espèces sensibles | **Livrée en grande partie** (2026-10-21) : carte des trouvailles, placement par toucher / « Ma position » / recherche Nominatim, précision approximative (~1 km, par défaut) ou exacte, espèces sensibles floutées (~10 km), panneau de marqueur, mini-carte sur l'observation. Puis (2026-10-25, demande de Tommy) : carte toujours affichée avec la position du téléphone en direct (réglage « Position automatique », activé par défaut, désactivable dans Profil), point exact placé d'office dans une nouvelle observation et suivi tant qu'on ne le déplace pas ; mode « Rencontre passée » (date au choix, pas de GPS, lieu approximatif posé à la main). Puis : carte plein écran au fond « jeu » minimal (OpenFreeMap + MapLibre, style maison ; fond OSM de secours ; CARTO retiré : clé exigée), bouton « + » central (appareil photo, galerie, saisie manuelle, rencontre passée), zone d'exploration de 1 km, recherche « Où le trouver ? » qui colore les secteurs d'observation iNaturalist d'un animal (aussi depuis chaque fiche). Reste : regroupement des marqueurs, filtres sur la carte |
| 3 — Données naturalistes | Connecteurs GBIF / iNaturalist / statuts de conservation, cache avec TTL, images attribuées, recherche d'espèces locales | **Largement faite** (iNaturalist, GBIF strict, cache, photos sous licence, zone, pack hors ligne). Reste : Liste rouge UICN (clé, via backend), signalement des écarts entre sources |
| 4 — Identification et découverte | Fournisseur d'identification interchangeable (via backend), espèces candidates, suggestions par région/saison, gestion des incertitudes | Partiel : import photo, statut « incertain / à identifier », découverte surprise sur catalogue |
| 5 — Gamification | Quêtes, badges, collections thématiques, statistiques, animations | Partiel : XP et niveau dérivés, badges simples, animation de révélation |
| 6 — Synchronisation | Supabase, auth facultative, RLS, sync, déploiement | À faire |

## Phase 1 — détail

Terminé :
- Structure `src/` en couches : `domain` (règles pures), `db` (IndexedDB + migrations), `repositories`, `services` (sauvegarde, photos, export PNG), `features/*` (écrans), `components` (UI).
- Design system : jetons de couleurs par type, effets de rareté, typographies embarquées (Fraunces, Inter), `prefers-reduced-motion` respecté.
- Navigation mobile à 5 onglets : Accueil, Découvrir, Carte, Collection, Profil.
- Catalogue vierge alimenté par iNaturalist, stocké dans IndexedDB, numéros de carte stables `AX-{id iNaturalist}`.
- Règles déterministes et documentées : types, rareté ludique, PV, capacités (`docs/GAME_RULES.md`).
- Carte Animodex (vue complète, compacte, export PNG).
- Fiche naturaliste séparée des statistiques de jeu, champs inconnus affichés « Donnée non disponible », sources affichées.
- Observations locales : création, modification, suppression (photos comprises), statut d'identification, lieu facultatif (texte seul en Phase 1, aucune coordonnée inventée).
- Une nouvelle observation d'une espèce connue n'ajoute pas d'espèce au Pokédex.
- Sauvegarde JSON versionnée : export, validation, prévisualisation, fusion ou remplacement confirmé, transaction atomique.
- PWA : manifeste, icônes, service worker (precache de l'app), invite de mise à jour.

Partiel en Phase 1 :
- Écran Carte : liste les observations et leur lieu textuel ; la carte interactive arrive en Phase 2.
- Découvrir : espèces observées dans une zone (lieu ou position arrondie + rayon), filtre par groupe et par mois, découverte surprise, pack hors ligne de 200 espèces par zone.

Non implémenté : voir phases 2 à 6.

## Limites connues (Phase 1)

- Connecteurs iNaturalist / GBIF testés seulement avec des réponses simulées (API injoignables depuis l'environnement de développement).
- Les fiches ne contiennent que ce que fournit iNaturalist : masse, longévité, régime… souvent « Donnée non disponible ».
- Photos de référence sous licences CC dont certaines « NC » (usage non commercial) : à revoir si l'app devenait commerciale.
- Il faut du réseau pour ajouter une espèce au catalogue (ensuite elle reste disponible hors ligne).
- Pas d'identification automatique par photo (aucun fournisseur configuré) : recherche manuelle uniquement.
- Badges simples et XP dérivée ; pas encore de quêtes.
- Stockage local uniquement : sur iOS, Safari peut effacer les données d'un site peu utilisé. L'app demande un stockage persistant et propose l'export JSON ; l'installation sur l'écran d'accueil réduit ce risque.
- Testé sous Chromium avec émulation iPhone, pas encore sur un iPhone réel.
- Numéros des anciennes cartes Animodex inconnus : le champ `legacyCardNumbers` est prêt pour les rattacher.

## Version « un seul fichier »

`npm run build:single` produit `dist-single/index.html`, autonome (JS, CSS, polices et icônes intégrés, routes dans le `#`), à déposer tel quel sur GitHub Pages ou n'importe quel hébergement. Limite : pas de service worker, donc pas de mode hors ligne complet ni d'invite de mise à jour ; les données restent bien dans IndexedDB.

## Ancien plan de la Phase 2 (pour mémoire)

1. Leaflet + tuiles OSM, regroupement des marqueurs (`leaflet.markercluster`).
2. Formulaire d'observation : « Utiliser ma position » (sur action), choix de la précision (exacte privée / approximative arrondie / aucune), placement manuel sur la carte.
3. Recherche de lieu via Nominatim (limitation 1 req/s, cache, état indisponible hors ligne).
4. Panneau de marqueur : photo, date, carte, fiche, statut, précision.
5. Filtres (espèce, type, date, habitat, rareté) ; espèces sensibles toujours généralisées.
6. Test de parcours « le marqueur apparaît sur la carte ».
