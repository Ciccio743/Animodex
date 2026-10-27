# Règles de jeu (version `GAME_RULES_VERSION = 1`)

Les statistiques Animodex sont **fictives et ludiques**. Elles ne sont jamais présentées comme des faits biologiques. Elles sont calculées à partir des données de l'espèce (taxonomie et nombre d'observations iNaturalist), jamais au hasard. Une carte est créée **une seule fois** par espèce, à la première observation confirmée ; ses valeurs sont ensuite figées (la carte garde sa `rulesVersion`).

Code : `src/domain/gameConfig.ts`, `taxonRules.ts`, `typing.ts`, `rarity.ts`, `abilities.ts`, `cards.ts`, `xp.ts`.

## Numéro de carte

`AX-{identifiant de taxon iNaturalist}` (ex. `AX-12345`). Il est stable par construction : il ne dépend ni de l'ordre d'ajout, ni de l'appareil. L'identifiant interne de l'espèce est `inat-{id}`. Le champ `legacyCardNumbers` permet de rattacher d'anciens numéros Animodex.

## Types

Table de règles par taxon (`TAXON_RULES`). La règle la plus précise l'emporte : **famille > ordre > classe > embranchement**, puis une règle de dernier recours (Terre). Chaque règle donne un type principal, un type secondaire facultatif, des capacités candidates et une justification courte affichée sur la fiche. Exemples : Ardeidae → Eau / Air ; Strigiformes → Ombre / Air ; Felidae → Ombre / Terre ; Odonata → Insecte / Eau ; Passeriformes → Air / Végétation.

## Rareté ludique

Distincte du statut de conservation. Basée sur le nombre **mondial** d'observations iNaturalist au moment de la création de la carte :

| Observations | Rareté | PV |
|---|---|---|
| ≥ 50 000 | Commun | 30–50 |
| ≥ 10 000 | Rare | 60–90 |
| ≥ 1 000 | Épique | 100–130 |
| < 1 000 | Légendaire | 140–180 |
| inconnu | Rare | 60–90 |

## PV

`PV = min + (idTaxon mod nbPas) × 5`, où `nbPas = (max − min) / 5 + 1`. Déterministe, sans hasard.

## Capacité

Première capacité candidate de la règle de taxon ; sinon capacité par défaut du type principal. Catalogue : `src/data/abilities.ts` (29 capacités).

## XP (dérivée, jamais stockée)

| Événement | XP |
|---|---|
| Nouvelle espèce | 100 |
| Nouveau groupe (oiseaux, mammifères…) | 50 |
| Nouvel ordre | 30 |
| Nouvelle famille | 20 |
| Nouvelle observation d'une espèce connue | 10 (une fois par espèce et par jour) |

Seules les observations **confirmées** comptent. Réenregistrer la même rencontre ne rapporte rien de plus.

## Découverte surprise

Tirage pondéré parmi les espèces de la zone (ou du catalogue local) : Commun 50, Rare 30, Épique 15, Légendaire 5. La probabilité réelle est affichée. **Une découverte surprise ne débloque jamais de carte** : seule une observation réelle le fait.

## Finitions de carte (« sortes de cartes »)

Chaque carte a une finition purement décorative, tirée au sort (`src/domain/finishes.ts`) :

| Finition | Chance |
|---|---|
| Nature | 40 % |
| Aquarelle | 18 % |
| Rosée | 12 % |
| Crépuscule | 9 % |
| Givre | 7 % |
| Aurore | 5 % |
| Lucioles | 4 % |
| Vitrail | 2,5 % |
| Nuit étoilée | 1,5 % |
| Soleil d'or | 0,8 % |
| Prisme | 0,2 % |

- Tirage à la création de la carte, puis à **chaque nouvelle observation confirmée** de l'espèce (pas lors d'une modification).
- Toutes les finitions tirées sont gardées (`finishesFound`) ; la carte affiche la plus rare (`finish`).
- Une carte créée avant les finitions est « Nature ».
- La finition est indépendante de la rareté de l'espèce, affichée par les empreintes (1 à 4).

La carte (recto « timbre d'explorateur ») n'affiche plus les PV ni la capacité : ils restent calculés et visibles sur la fiche de l'espèce. Le dos de carte est `src/assets/card-back.webp`.
