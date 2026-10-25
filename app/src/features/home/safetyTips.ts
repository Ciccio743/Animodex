/** Conseils de sécurité naturaliste affichés en rotation (un par jour). */
export const SAFETY_TIPS = [
  'Observe de loin : si l’animal change de comportement, c’est que tu es trop près.',
  'On ne touche pas les animaux sauvages, même s’ils semblent blessés ou seuls. Préviens un adulte.',
  'Reste sur les chemins et n’entre jamais sur une propriété privée.',
  'Ne déplace pas les nids, les pierres ou les bûches qui servent d’abri, ou remets-les doucement en place.',
  'Ne nourris pas les animaux sauvages : leur nourriture naturelle est meilleure pour eux.',
  'Près de l’eau, reste toujours avec un adulte.',
  'Un animal photographié est un souvenir : aucune photo ne vaut de le déranger.',
];

export function tipOfTheDay(d = new Date()): string {
  const day = Math.floor(d.getTime() / 86_400_000);
  return SAFETY_TIPS[day % SAFETY_TIPS.length];
}
