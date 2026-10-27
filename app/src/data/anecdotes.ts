import type { Species, TaxonGroup } from '../domain/models';

/**
 * Anecdotes « Le savais-tu ? » écrites pour Animodex : courtes (une carte = 3 lignes), en français simple,
 * sur des faits connus. Clés : nom scientifique (espèce), puis genre, famille, ordre ; le groupe sert de
 * filet pour que chaque carte ait toujours une anecdote.
 */
const BY_SPECIES: Record<string, string[]> = {
  // Oiseaux
  'Turdus merula': [
    'Seul le mâle est tout noir avec un bec jaune : la femelle est brune.',
    'Le mâle chante perché tout en haut des toits dès la fin de l’hiver, parfois même la nuit sous les lampadaires.',
  ],
  'Turdus philomelos': ['Elle casse les coquilles d’escargots en les frappant contre une pierre, sa petite « enclume ».'],
  'Erithacus rubecula': [
    'Il suit les jardiniers qui bêchent pour attraper les vers de terre qu’ils déterrent.',
    'Il chante même en plein hiver pour défendre son territoire, et la femelle chante aussi.',
  ],
  'Parus major': ['Son chant ressemble au bruit d’une pompe à vélo : « ti-tu, ti-tu, ti-tu ».'],
  'Cyanistes caeruleus': ['Elle ne pèse qu’environ 11 grammes et se suspend la tête en bas au bout des branches.'],
  'Aegithalos caudatus': ['Elle construit un nid en boule avec de la mousse, des toiles d’araignée et des centaines de plumes.'],
  'Sitta europaea': ['C’est l’un des rares oiseaux capables de descendre un tronc la tête la première.'],
  'Passer domesticus': ['Il prend des bains de poussière pour se débarrasser de ses petits parasites.'],
  'Columba palumbus': ['Les parents nourrissent leurs petits avec un « lait » fabriqué dans leur jabot.'],
  'Columba livia': ['Il sait retrouver son chemin sur des centaines de kilomètres en se repérant au soleil.'],
  'Streptopelia decaocto': ['Venue d’Asie, elle s’est installée dans toute l’Europe en moins d’un siècle.'],
  'Pica pica': ['C’est l’un des rares oiseaux capables de se reconnaître dans un miroir.'],
  'Corvus corone': ['Certaines corneilles posent des noix sur la route pour que les voitures les cassent.'],
  'Garrulus glandarius': ['Il cache des milliers de glands pour l’hiver : ceux qu’il oublie deviennent des chênes.'],
  'Sturnus vulgaris': ['Il imite le chant d’autres oiseaux, et parfois même des sonneries de téléphone.'],
  'Ardea cinerea': ['Il peut rester immobile de longues minutes avant de harponner un poisson d’un coup de bec.'],
  'Cygnus olor': ['C’est l’un des oiseaux volants les plus lourds : un mâle peut dépasser 10 kilos.'],
  'Anas platyrhynchos': ['Le « coin-coin » bien sonore, c’est la femelle : le mâle a une voix plus discrète.'],
  'Fulica atra': ['Ses doigts ont de larges lobes qui lui servent de palmes pour nager.'],
  'Gallinula chloropus': ['Ses très longs doigts lui permettent de marcher sur les feuilles qui flottent.'],
  'Ciconia ciconia': ['Elle n’a presque pas de voix : elle claque du bec pour « parler ».'],
  'Phoenicopterus roseus': ['Sa couleur rose vient des petites crevettes et des algues qu’il mange.'],
  'Hirundo rustica': ['Elle passe l’hiver en Afrique, à des milliers de kilomètres, et revient souvent au même nid.'],
  'Delichon urbicum': ['Elle bâtit son nid sous les toits avec des centaines de petites boulettes de boue.'],
  'Apus apus': ['Il peut voler des mois sans jamais se poser : il mange, boit et dort en vol !'],
  'Buteo buteo': ['Elle se poste sur les piquets au bord des routes pour guetter les campagnols.'],
  'Falco tinnunculus': ['Il fait du « sur-place » face au vent avant de plonger sur un petit rongeur.'],
  'Tyto alba': ['Ses oreilles ne sont pas à la même hauteur : ça l’aide à trouver une souris dans le noir complet.'],
  'Strix aluco': ['Le « hou-hou » est le chant du mâle, et le « kiwitt » celui de la femelle.'],
  'Athene noctua': ['Cette petite chouette chasse aussi le jour, perchée sur un piquet ou un vieux mur.'],
  'Dendrocopos major': ['Il tambourine sur le bois jusqu’à une vingtaine de coups par seconde, sans mal de tête !'],
  'Picus viridis': ['Il mange surtout des fourmis, qu’il attrape avec une langue très longue et collante.'],
  'Alcedo atthis': ['Son bec qui fend l’eau sans éclabousser a inspiré le nez d’un train à grande vitesse japonais.'],
  'Fringilla coelebs': ['Selon la région, les pinsons n’ont pas tout à fait le même chant : ils ont des accents !'],
  'Carduelis carduelis': ['Son bec fin comme une pince lui permet de sortir les graines des chardons.'],
  'Troglodytes troglodytes': ['Le mâle construit plusieurs nids et c’est la femelle qui choisit son préféré.'],
  'Phoenicurus ochruros': ['Il fait trembler sans arrêt sa queue rousse.'],
  'Motacilla alba': ['Elle remue sans cesse la queue de haut en bas en marchant.'],
  'Larus michahellis': ['Le point rouge sur son bec sert aux poussins : ils le tapotent pour réclamer à manger.'],
  'Chroicocephalus ridibundus': ['Sa tête brun chocolat en été devient blanche en hiver, avec juste une tache noire.'],
  'Cuculus canorus': ['La femelle pond dans le nid d’autres oiseaux, qui élèvent le petit coucou à sa place.'],
  'Upupa epops': ['Pour se défendre, la femelle et ses petits produisent un liquide qui sent très mauvais.'],
  'Oriolus oriolus': ['Le mâle est jaune vif, mais il se cache si bien dans les feuilles qu’on l’entend plus qu’on ne le voit.'],
  'Luscinia megarhynchos': ['Il chante aussi la nuit, avec un répertoire de plus de 200 phrases différentes.'],
  // Mammifères
  'Vulpes vulpes': [
    'Il entend une souris gratter sous la neige et plonge dessus d’un bond.',
    'Il s’enroule dans sa grosse queue touffue comme dans une couverture pour dormir.',
  ],
  'Erinaceus europaeus': ['Il porte entre 5 000 et 7 000 piquants et dort tout l’hiver.'],
  'Sciurus vulgaris': ['Il cache des noisettes partout pour l’hiver ; celles qu’il oublie font pousser des arbres.'],
  'Capreolus capreolus': ['Quand il a peur, il « aboie » presque comme un chien.'],
  'Cervus elaphus': ['Ses bois tombent chaque fin d’hiver et repoussent, souvent plus grands, chaque année.'],
  'Sus scrofa': ['Son groin a un flair incroyable : il sent des glands ou des truffes cachés sous la terre.'],
  'Lepus europaeus': ['Il peut courir à plus de 60 km/h en zigzaguant pour semer ses poursuivants.'],
  'Oryctolagus cuniculus': ['Il tape le sol avec ses pattes arrière pour prévenir les autres d’un danger.'],
  'Meles meles': ['Il vit en famille dans un grand terrier à plusieurs entrées, qu’il garde très propre.'],
  'Talpa europaea': ['Elle garde des vers de terre vivants dans un garde-manger sous la terre.'],
  'Pipistrellus pipistrellus': ['Cette petite chauve-souris peut avaler des centaines de moustiques en une seule nuit.'],
  'Lutra lutra': ['Ses moustaches très sensibles l’aident à trouver les poissons dans l’eau trouble.'],
  'Castor fiber': ['Ses dents orange ne s’arrêtent jamais de pousser : le fer qu’elles contiennent les rend solides.'],
  'Martes foina': ['Elle aime se cacher dans les greniers et grignote parfois les câbles des voitures.'],
  'Myocastor coypus': ['Ses grandes dents de devant sont orange vif.'],
  'Rupicapra rupicapra': ['Ses sabots ont des coussinets qui accrochent la roche comme des chaussons d’escalade.'],
  'Marmota marmota': ['Elle siffle fort pour prévenir sa famille quand un aigle approche, et hiberne près de 6 mois.'],
  'Apodemus sylvaticus': ['Grâce à ses longues pattes arrière, il fait des bonds comme un petit kangourou.'],
  // Insectes
  'Apis mellifera': ['Elle danse pour indiquer à ses sœurs où trouver les fleurs !'],
  'Bombus terrestris': ['Il fait vibrer ses muscles pour se réchauffer avant de s’envoler.'],
  'Coccinella septempunctata': ['Une seule coccinelle peut dévorer des dizaines de pucerons par jour.'],
  'Harmonia axyridis': ['Venue d’Asie, elle peut avoir de 0 à 19 points sur le dos.'],
  'Vanessa atalanta': ['Il adore se régaler des fruits trop mûrs tombés au sol.'],
  'Aglais io': ['Les gros « yeux » sur ses ailes font peur aux oiseaux qui voudraient le manger.'],
  'Pieris rapae': ['Sa chenille verte se régale des feuilles de chou.'],
  'Macroglossum stellatarum': ['Il vole sur place devant les fleurs comme un colibri, avec une longue trompe.'],
  'Lucanus cervus': ['Les grandes « cornes » du mâle sont ses mâchoires : il s’en sert pour lutter avec ses rivaux.'],
  'Mantis religiosa': ['Elle peut tourner la tête pour regarder par-dessus son épaule, rare chez un insecte !'],
  'Formica rufa': ['Une seule de leurs fourmilières peut abriter des centaines de milliers de fourmis.'],
  'Vespa crabro': ['Ce grand frelon chasse aussi la nuit, attiré par les lumières.'],
  'Pyrrhocoris apterus': ['On le voit souvent en grands groupes au pied des tilleuls.'],
  'Anax imperator': ['Elle attrape ses proies en plein vol en formant un panier avec ses pattes.'],
  'Lampyris noctiluca': ['Ce n’est pas un ver mais un coléoptère : la femelle s’allume pour attirer les mâles.'],
  'Gryllus campestris': ['Il chante en frottant ses ailes, et ses oreilles sont sur ses pattes avant !'],
  'Cetonia aurata': ['Sa larve, un gros ver blanc, aide à transformer les feuilles mortes en compost.'],
  // Amphibiens et reptiles
  'Bufo bufo': ['Chaque printemps, il retourne pondre dans la mare où il est né.'],
  'Rana temporaria': ['Elle peut passer l’hiver au fond d’une mare, même quand la surface est gelée.'],
  'Salamandra salamandra': ['Ses taches jaunes préviennent les prédateurs : sa peau contient un poison.'],
  'Ichthyosaura alpestris': ['Comme tous les tritons, il peut faire repousser une patte perdue.'],
  'Podarcis muralis': ['Il peut lâcher sa queue pour échapper à un prédateur ; elle repousse ensuite.'],
  'Lacerta bilineata': ['Au printemps, le mâle a la gorge d’un bleu éclatant.'],
  'Anguis fragilis': ['Il ressemble à un serpent, mais c’est un lézard sans pattes : il peut cligner des yeux.'],
  'Natrix helvetica': ['Quand on l’embête, elle fait la morte, la langue pendante.'],
  'Vipera aspis': ['Ses pupilles sont fendues verticalement, comme celles d’un chat.'],
  // Autres
  'Cornu aspersum': ['Sa langue porte des milliers de minuscules dents pour râper les feuilles.'],
  'Helix pomatia': ['En hiver, il ferme sa coquille avec un couvercle de calcaire et dort jusqu’au printemps.'],
  'Araneus diadematus': ['Elle refait sa toile presque chaque jour… et mange l’ancienne pour recycler la soie.'],
  'Argiope bruennichi': ['Elle tisse un grand zigzag blanc au milieu de sa toile.'],
  'Pholcus phalangioides': ['Quand on la dérange, elle fait vibrer sa toile si vite qu’elle devient floue.'],
  'Esox lucius': ['Il attend immobile entre les herbes, puis fonce sur sa proie comme une flèche.'],
  'Gasterosteus aculeatus': ['C’est le papa qui construit le nid et garde les œufs.'],
  'Cyprinus carpio': ['Une carpe peut vivre plusieurs dizaines d’années.'],
};

const BY_TAXON: Record<string, string[]> = {
  // Genres
  Turdus: ['Les merles et les grives cherchent les vers en penchant la tête pour mieux écouter et regarder le sol.'],
  Bombus: ['Les bourdons peuvent voler par temps frais, quand il fait trop froid pour les abeilles.'],
  Pelophylax: ['Le mâle gonfle deux ballons sur les côtés de la tête pour chanter plus fort.'],
  Larus: ['Les goélands peuvent boire de l’eau de mer : une glande au-dessus des yeux rejette le sel.'],
  Vespa: ['Les frelons construisent leur nid avec du bois mâché, comme du papier.'],
  // Familles
  Paridae: ['Les mésanges comprennent les cris d’alerte des autres espèces d’oiseaux.'],
  Corvidae: ['Les corvidés sont parmi les oiseaux les plus malins : ils savent résoudre des énigmes.'],
  Accipitridae: ['Les rapaces voient plusieurs fois mieux que nous : ils repèrent une souris de très haut.'],
  Strigidae: ['Les chouettes et hiboux volent sans bruit grâce aux bords frangés de leurs plumes.'],
  Picidae: ['Les pics ont une langue si longue qu’elle s’enroule autour de leur crâne.'],
  Anatidae: ['Les canards ont une glande qui graisse leurs plumes pour qu’elles restent imperméables.'],
  Hirundinidae: ['Les hirondelles attrapent les insectes en plein vol, bec grand ouvert.'],
  Columbidae: ['Les pigeons et tourterelles boivent en aspirant l’eau, sans lever la tête.'],
  Laridae: ['Les goélands et mouettes peuvent boire de l’eau de mer et rejeter le sel par le bec.'],
  Ardeidae: ['Les hérons ont un cou en forme de S qui se détend comme un ressort pour attraper les poissons.'],
  Fringillidae: ['Les fringilles ont un bec court et solide, parfait pour casser les graines.'],
  Cervidae: ['Chez les cerfs et chevreuils, seuls les mâles ont des bois : ils tombent et repoussent chaque année.'],
  Mustelidae: ['Les mustélidés ont un corps long et souple pour se faufiler partout.'],
  Muridae: ['Les souris et mulots ont des dents qui poussent toute leur vie : ils doivent ronger pour les user.'],
  Sciuridae: ['Les écureuils peuvent descendre des troncs la tête en bas en tournant leurs pattes arrière.'],
  Vespertilionidae: ['Ces chauves-souris « voient » avec leurs oreilles : elles crient et écoutent l’écho.'],
  Canidae: ['Les renards et les loups sont cousins des chiens.'],
  Erinaceidae: ['Les hérissons se roulent en boule piquante au moindre danger.'],
  Apidae: ['Les abeilles transportent le pollen dans de petites « corbeilles » sur leurs pattes.'],
  Coccinellidae: ['Les coccinelles sentent mauvais quand on les attrape : c’est leur défense.'],
  Nymphalidae: ['Ces papillons ont deux pattes avant toutes petites : on croirait qu’ils n’en ont que quatre.'],
  Pieridae: ['Les papillons blancs et jaunes aiment se réchauffer au soleil, ailes fermées.'],
  Lycaenidae: ['Les chenilles de certains azurés se font nourrir par des fourmis !'],
  Formicidae: ['Les fourmis se parlent avec des odeurs pour se montrer le chemin.'],
  Vespidae: ['Les guêpes fabriquent du papier en mâchant du bois pour construire leur nid.'],
  Carabidae: ['Les carabes sont de grands chasseurs de limaces, amis des jardiniers.'],
  Libellulidae: ['Les libellules ont des yeux géants qui voient presque tout autour d’elles.'],
  Araneidae: ['Ces araignées tissent de grandes toiles rondes, parfois chaque jour.'],
  Helicidae: ['Les escargots ont leurs yeux au bout de leurs grandes cornes.'],
  Ranidae: ['Les grenouilles boivent par la peau, pas par la bouche.'],
  Bufonidae: ['Les crapauds ont une peau sèche et bosselée qui peut contenir un peu de poison.'],
  Salamandridae: ['Les tritons et salamandres peuvent faire repousser une patte perdue.'],
  Lacertidae: ['Les lézards se réchauffent au soleil le matin avant de pouvoir chasser.'],
  Colubridae: ['Les couleuvres sentent avec leur langue, qu’elles sortent sans arrêt.'],
  Cyprinidae: ['Les carpes et gardons n’ont pas de dents dans la bouche, mais au fond de la gorge.'],
  // Ordres
  Odonata: ['Leurs ancêtres volaient déjà avant les dinosaures, et certains étaient grands comme un pigeon.'],
  Lepidoptera: ['Les papillons goûtent avec leurs pattes en se posant sur les fleurs.'],
  Coleoptera: ['Les coléoptères ont des ailes dures qui protègent les ailes de vol pliées dessous.'],
  Orthoptera: ['Criquets et sauterelles peuvent sauter jusqu’à 20 fois la longueur de leur corps.'],
  Hymenoptera: ['Abeilles, guêpes et fourmis sont de la même grande famille d’insectes.'],
  Diptera: ['Les mouches n’ont que deux ailes : de petits balanciers remplacent la deuxième paire.'],
  Hemiptera: ['Les punaises ont une sorte de paille pour aspirer la sève ou leurs proies.'],
  Araneae: ['Le fil d’araignée est plus solide qu’un fil d’acier de même épaisseur.'],
  Anura: ['Les grenouilles et crapauds boivent par la peau.'],
  Caudata: ['Les tritons et salamandres peuvent faire repousser une patte perdue.'],
  Chiroptera: ['Les chauves-souris sont les seuls mammifères capables de vraiment voler.'],
  Rodentia: ['Les rongeurs ont des dents de devant qui poussent toute leur vie.'],
  Testudines: ['Les tortues existent depuis plus de 200 millions d’années.'],
  Strigiformes: ['Les chouettes et hiboux tournent la tête aux trois quarts d’un tour.'],
  Accipitriformes: ['Les rapaces voient plusieurs fois mieux que nous : ils repèrent une souris de très haut.'],
};

const BY_GROUP: Record<TaxonGroup, string[]> = {
  bird: ['Les oiseaux descendent des dinosaures : ce sont leurs cousins vivants !', 'Les os des oiseaux sont creux, ce qui les rend légers pour voler.'],
  mammal: ['Les mammifères nourrissent leurs petits avec du lait.', 'La musaraigne étrusque, le plus petit mammifère d’Europe, pèse moins de 2 grammes.'],
  reptile: ['Les reptiles ont le sang froid : ils se réchauffent au soleil.'],
  amphibian: ['Les amphibiens vivent d’abord dans l’eau comme têtards, puis sur terre.'],
  fish: ['Les poissons sentent les mouvements de l’eau grâce à une ligne sur leurs flancs.'],
  insect: ['Les insectes ont toujours six pattes, et leur squelette est à l’extérieur.'],
  other_invertebrate: ['Les invertébrés n’ont pas d’os : ce sont plus de 9 animaux sur 10 sur Terre !'],
};

/** Une anecdote stable pour l'espèce (toujours la même pour une espèce donnée). */
export function anecdoteFor(species: Pick<Species, 'id' | 'scientificName' | 'taxonomy' | 'group'>): string {
  const t = species.taxonomy;
  const list =
    BY_SPECIES[species.scientificName] ?? [t.genus, t.family, t.order].map((k) => (k ? BY_TAXON[k] : undefined)).find(Boolean) ?? BY_GROUP[species.group];
  return list[hash(species.id) % list.length];
}

export const ANECDOTE_LISTS = { BY_SPECIES, BY_TAXON, BY_GROUP };

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
