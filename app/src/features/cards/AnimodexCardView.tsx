import { forwardRef } from 'react';
import { Star } from 'lucide-react';
import { GROUP_LABELS, HABITAT_LABELS, RARITY_LABELS, RARITY_STARS, TYPE_LABELS } from '../../domain/labels';
import { displayName } from '../../domain/models';
import { GROUP_ICON, typeStyle } from '../../components/typeTheme';
import { TypeIcon } from '../../components/TypeIcon';
import { discoveryLine, type CardView } from './cardView';

interface Props {
  view: CardView;
  /** Photo personnelle de l'observation (jamais une image inventée). */
  photoUrl?: string;
  photoCaption?: string;
  className?: string;
}

/** Carte Animodex complète, au format 63×88. */
export const AnimodexCardView = forwardRef<HTMLDivElement, Props>(function AnimodexCardView({ view, photoUrl, photoCaption, className = '' }, ref) {
  const { species, card, ability, unlocked } = view;
  const GroupIcon = GROUP_ICON[species.group];
  const stars = RARITY_STARS[card.rarity];
  const name = displayName(species);
  const habitat = species.habitats.length ? species.habitats.slice(0, 2).map((h) => HABITAT_LABELS[h]).join(' · ') : undefined;
  const context = [GROUP_LABELS[species.group], species.taxonomy.family].filter(Boolean).join(' · ');
  const place = discoveryLine(view);
  const reference = !photoUrl ? species.media[0] : undefined;
  const description = shortDescription(species.description?.text);

  return (
    <div
      ref={ref}
      className={`ax-card rarity-${card.rarity} ${unlocked ? '' : 'is-preview'} ${className}`}
      style={typeStyle(card.primaryType, card.secondaryType)}
      role="img"
      aria-label={`Carte ${name}, ${RARITY_LABELS[card.rarity]}, type ${TYPE_LABELS[card.primaryType]}, ${card.baseHp} PV, numéro ${card.cardNumber}`}
      data-testid="animodex-card"
    >
      <div className="ax-card__inner">
        <div className="ax-card__header">
          <div className="ax-card__type" title={`Type ${TYPE_LABELS[card.primaryType]}`}>
            <TypeIcon type={card.primaryType} />
          </div>
          <div className="min-w-0">
            <div className={`ax-card__name ${name.length > 15 ? 'is-long' : ''} ${species.frenchName ? '' : 'italic'}`}>{name}</div>
            <div className="ax-card__rarity">{RARITY_LABELS[card.rarity]}</div>
          </div>
          <div className="ax-card__hp">
            <small>PV</small>
            {card.baseHp}
          </div>
        </div>

        <div className="ax-card__image">
          {photoUrl ? (
            <>
              <img src={photoUrl} alt={`Photo d’observation : ${name}`} />
              {photoCaption && <div className="ax-card__credit">{photoCaption}</div>}
            </>
          ) : reference ? (
            <>
              <img src={reference.url} alt={`Photo de référence : ${name}`} crossOrigin="anonymous" referrerPolicy="no-referrer" />
              <div className="ax-card__credit">
                Photo de référence : {reference.creator ?? 'auteur iNaturalist'} · {reference.license} · {reference.source}
              </div>
            </>
          ) : (
            <div className="ax-card__placeholder">
              <GroupIcon aria-hidden="true" />
              <span>Pas encore de photo</span>
            </div>
          )}
        </div>

        <div className="ax-card__meta">
          <span>{habitat ? <><b>Habitat :</b> {habitat}</> : <><b>Groupe :</b> {context}</>}</span>
          {place && <span>{place}</span>}
        </div>

        <div className="ax-card__body">
          {description ? (
            <p className="ax-card__desc">
              {description} <span className="ax-card__src">— {species.description!.source}, {species.description!.license}</span>
            </p>
          ) : (
            <p className="ax-card__desc">Description non disponible.</p>
          )}
          <div className="ax-card__ability">
            <div className="ax-card__ability-name">
              {ability.name}
              <span className="tag">Capacité</span>
            </div>
            <div className="ax-card__ability-effect">{ability.effectText}</div>
          </div>
        </div>

        <div className="ax-card__footer">
          <div className="ax-card__secondary">
            {card.secondaryType && (
              <>
                <span className="dot" title={`Type secondaire ${TYPE_LABELS[card.secondaryType]}`}>
                  <TypeIcon type={card.secondaryType} />
                </span>
                <span>{TYPE_LABELS[card.secondaryType]}</span>
              </>
            )}
          </div>
          <div className="ax-card__number">{card.cardNumber}</div>
          <div className="ax-card__rarity-emblem">
            <span className="ax-card__stars" aria-hidden="true">
              {Array.from({ length: stars }, (_, i) => (
                <Star key={i} />
              ))}
            </span>
            <span className="ax-card__emblem" aria-hidden="true" />
          </div>
        </div>
        <div className="ax-card__fiction">PV et capacité : statistiques de jeu fictives</div>
      </div>
      <div className="ax-card__shine" aria-hidden="true" />
      {!unlocked && <div className="ax-card__ribbon">Aperçu — pas encore découverte</div>}
    </div>
  );
});

/** Première phrase du résumé (≤ 150 caractères), pour rester lisible sur la carte. */
function shortDescription(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const first = text.split(/(?<=[.!?])\s/)[0];
  return first.length <= 150 ? first : `${first.slice(0, 147).trimEnd()}…`;
}
