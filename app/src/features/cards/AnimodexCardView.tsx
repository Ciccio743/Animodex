import { forwardRef } from 'react';
import { Sparkles } from 'lucide-react';
import { HABITAT_LABELS, RARITY_LABELS, RARITY_STARS } from '../../domain/labels';
import { displayName } from '../../domain/models';
import { cardFinish } from '../../domain/cards';
import { FINISH_LABELS, type CardFinish } from '../../domain/finishes';
import { GROUP_ICON } from '../../components/typeTheme';
import { discoveryLine, type CardView } from './cardView';
import { GROUP_SINGULAR, groupStyle, landStyle } from './cardTheme';

interface Props {
  view: CardView;
  /** Photo personnelle de l'observation (jamais une image inventée). */
  photoUrl?: string;
  /** Version à afficher (par défaut : la plus rare trouvée). */
  finish?: CardFinish;
  className?: string;
}

const postmarkDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Carte Animodex « timbre d'explorateur », au format 63×88. */
export const AnimodexCardView = forwardRef<HTMLDivElement, Props>(function AnimodexCardView({ view, photoUrl, finish: shownFinish, className = '' }, ref) {
  const { species, card, unlocked } = view;
  const GroupIcon = GROUP_ICON[species.group];
  const paws = RARITY_STARS[card.rarity];
  const finish = shownFinish ?? cardFinish(card);
  const name = displayName(species);
  const habitat = species.habitats[0];
  const place = discoveryLine(view);
  const first = unlocked ? view.firstObservation : undefined;
  const stampPlace = first ? (species.sensitive ? 'lieu masqué' : first.locationLabel) : undefined;
  const reference = !photoUrl ? species.media[0] : undefined;
  const description = shortDescription(species.description?.text);

  return (
    <div ref={ref} className={`ax-card-host ${className}`}>
      <div
        className={`ax-card finish-${finish} ${unlocked ? '' : 'is-preview'}`}
        style={landStyle(species.habitats)}
        role="img"
        aria-label={`Carte ${name}, ${RARITY_LABELS[card.rarity]}, finition ${FINISH_LABELS[finish]}, numéro ${card.cardNumber}`}
        data-testid="animodex-card"
      >
        <div className="ax-card__paper">
          <div className="ax-card__scene">
            <div className="ax-card__extra" aria-hidden="true" />
            <span className="ax-card__group" style={groupStyle(species.group)} title={GROUP_SINGULAR[species.group]}>
              <GroupIcon aria-hidden="true" strokeWidth={2.4} />
            </span>
            {first && (
              <div className="ax-card__postmark" title={place}>
                Vu le
                <strong>{postmarkDate.format(new Date(first.observedAt)).replaceAll('/', '·')}</strong>
                {stampPlace && <span>{stampPlace}</span>}
              </div>
            )}
            <div className="ax-card__medal">
              {photoUrl ? (
                <img src={photoUrl} alt={`Photo d’observation : ${name}`} />
              ) : reference ? (
                <img src={reference.url} alt={`Photo de référence : ${name}`} crossOrigin="anonymous" referrerPolicy="no-referrer" />
              ) : (
                <div className="ax-card__placeholder">
                  <GroupIcon aria-hidden="true" />
                  <span>Pas encore de photo</span>
                </div>
              )}
            </div>
            <div className={`ax-card__name ${name.length > 14 ? 'is-long' : ''} ${species.frenchName ? '' : 'is-latin'}`}>{name}</div>
          </div>

          <div className="ax-card__info">
            {species.frenchName && <div className="ax-card__latin">{species.scientificName}</div>}
            <div className="ax-card__chips">
              {habitat && <span className="ax-card__chip is-habitat">{HABITAT_LABELS[habitat]}</span>}
              <span className="ax-card__chip is-group">{GROUP_SINGULAR[species.group]}</span>
              {unlocked && view.observationCount > 0 && (
                <span className="ax-card__chip">Vu {view.observationCount} fois</span>
              )}
            </div>
            {place && <div className="ax-card__discovery">{place}</div>}
            <div className="ax-card__fact">
              <p>
                {description ? (
                  <>
                    <b>Le savais-tu ?</b> {description}
                  </>
                ) : (
                  'Description non disponible.'
                )}
              </p>
            </div>
            {description && (
              <div className="ax-card__credit">
                Texte : {species.description!.source}, {species.description!.license}
              </div>
            )}
            {reference && (
              <div className="ax-card__credit">
                Photo de référence : {reference.creator ?? 'auteur iNaturalist'} · {reference.license} · {reference.source}
              </div>
            )}
            <div className="ax-card__bottom">
              <span className="ax-card__paws" title={`Rareté de l’espèce : ${RARITY_LABELS[card.rarity]}`}>
                {Array.from({ length: 4 }, (_, i) => (
                  <Paw key={i} color={i < paws ? '#ff7a45' : '#e3dccd'} />
                ))}
              </span>
              {unlocked && (
                <span className="ax-card__finish">
                  <Sparkles aria-hidden="true" />
                  {FINISH_LABELS[finish]}
                </span>
              )}
              <span className="ax-card__number">{card.cardNumber}</span>
            </div>
          </div>
        </div>
        <div className="ax-card__foil" aria-hidden="true" />
        <div className="ax-card__glare" aria-hidden="true" />
        {!unlocked && <div className="ax-card__ribbon">Aperçu — pas encore découverte</div>}
      </div>
    </div>
  );
});

/** Empreinte de patte : une par niveau de rareté de l'espèce. */
export function Paw({ color, size }: { color: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <g fill={color}>
        <ellipse cx="12" cy="16" rx="5" ry="4.2" />
        <circle cx="5.5" cy="10" r="2.3" />
        <circle cx="9.5" cy="6" r="2.3" />
        <circle cx="14.5" cy="6" r="2.3" />
        <circle cx="18.5" cy="10" r="2.3" />
      </g>
    </svg>
  );
}

/** Première phrase du résumé (≤ 130 caractères), pour rester lisible sur la carte. */
function shortDescription(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const first = text.split(/(?<=[.!?])\s/)[0];
  return first.length <= 130 ? first : `${first.slice(0, 127).trimEnd()}…`;
}
