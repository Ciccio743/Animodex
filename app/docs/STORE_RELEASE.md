# Publier Animodex sur Google Play et l'App Store

Animodex est une application web (React + Vite). Pour les stores, elle est empaquetée avec **Capacitor** : le même code, dans une vraie application Android et iOS.

## Déjà fait dans le dépôt (2026-10-25)

- Capacitor 8 configuré (`capacitor.config.ts`, identifiant provisoire `com.animodex.app`).
- Projets natifs générés : `android/` (Gradle) et `ios/` (Xcode, Swift Package Manager).
- Permissions déclarées avec des textes en français :
  - Android : localisation (précise et approximative), appareil photo (`android/app/src/main/AndroidManifest.xml`).
  - iOS : localisation « lorsque l'app est active », appareil photo, galerie (`ios/App/App/Info.plist`).
- Scripts : `npm run cap:sync` (construit le web puis copie dans les projets natifs), `npm run cap:android`, `npm run cap:ios`.
- Données 100 % locales (IndexedDB), aucune clé secrète, pas de compte : rien à changer côté serveur.

**Non vérifié ici** : aucune compilation Android ou iOS n'a été faite (pas d'Android SDK ni de Mac dans l'environnement de développement). Le premier build se fera sur ton ordinateur.

## Ce qu'il te faut

| | Android (Google Play) | iOS (App Store) |
|---|---|---|
| Compte développeur | Google Play Console, 25 $ une seule fois | Apple Developer Program, 99 $ par an |
| Ordinateur | Windows, Mac ou Linux avec Android Studio | **Un Mac** avec Xcode (obligatoire pour iOS) |
| Test | Un téléphone Android ou l'émulateur | Ton iPhone (via Xcode ou TestFlight) |

## Étapes

1. `npm ci` puis `npm run cap:sync`.
2. **Icônes et écran de démarrage** : fournir une image carrée 1024×1024 (`assets/icon.png`, la version 512 actuelle est dans `assets/icon-source-512.png`), puis `npx @capacitor/assets generate`.
3. **Identifiant définitif** : choisir l'`appId` (ex. `fr.<ton-nom>.animodex`) dans `capacitor.config.ts` **avant** la première publication ; il ne pourra plus changer ensuite.
4. Android : `npm run cap:android` → Android Studio → *Build › Generate Signed Bundle* (.aab) → Play Console (test interne d'abord).
5. iOS : `npm run cap:ios` → Xcode → équipe de signature → *Product › Archive* → App Store Connect → TestFlight.
6. Fiches des stores : captures d'écran, description, **URL de politique de confidentialité** (brouillon : `docs/PRIVACY_POLICY.md`, à publier sur GitHub Pages), questionnaire « sécurité des données » (Google) et « confidentialité » (Apple) : aucune donnée collectée, position utilisée sur l'appareil uniquement.

## Points d'attention avant publication

- **Apple, règle 4.2 (fonctionnalités minimales)** : Apple refuse les simples sites web emballés. Animodex a des atouts (données hors ligne, appareil photo, localisation, collection), mais il est conseillé de passer aux plugins natifs `@capacitor/camera` et `@capacitor/geolocation` avant de soumettre.
- **Public enfant** : si l'app est déclarée « pour enfants » (catégorie Enfants d'Apple, programme Familles de Google), les règles sont plus strictes (pas de liens externes sans contrôle parental, etc.). À décider avant la soumission.
- **Licences** : en cas d'app payante ou avec publicité, retirer les photos sous licence « NC » (voir `SOURCES_AND_LICENSES.md`). Le fond de carte OpenFreeMap est gratuit sans limite ; le fond de secours OpenStreetMap n'est pas fait pour une forte audience (prévoir un autre fournisseur si l'app décolle).
- **Service worker** : inutile dans l'app native (les fichiers sont déjà dans l'app) ; il est ignoré sans conséquence.
- **Mises à jour** : chaque nouvelle version passe par la validation des stores (quelques heures à quelques jours).
