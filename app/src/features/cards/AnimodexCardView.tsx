import { forwardRef, useState, type ReactNode } from 'react';
import { Binoculars, CalendarDays } from 'lucide-react';
import { HABITAT_LABELS, RARITY_LABELS, RARITY_STARS } from '../../domain/labels';
import { displayName, type SpeciesMedia } from '../../domain/models';
import { cardFinish } from '../../domain/cards';
import { FINISH_LABELS, type CardFinish } from '../../domain/finishes';
import { GROUP_ICON } from '../../components/typeTheme';
import frameUrl from '../../assets/card-frame.webp';
import { anecdoteFor } from '../../data/anecdotes';
import { discoveryLine, type CardView } from './cardView';
import { GROUP_SINGULAR, groupStyle, habitatIcon } from './cardTheme';

interface Props {
  view: CardView;
  /** Photo personnelle de l'observation (jamais une image inventée). */
  photoUrl?: string;
  /** Version à afficher (par défaut : la plus rare trouvée). */
  finish?: CardFinish;
  className?: string;
}

const frameMask = { maskImage: `url(${frameUrl})`, WebkitMaskImage: `url(${frameUrl})` };

const stampDate = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Carte Animodex au format 63×88 : cadre orné, grande image, pastilles, « Le savais-tu ? ». */
export const AnimodexCardView = forwardRef<HTMLDivElement, Props>(function AnimodexCardView({ view, photoUrl, finish: shownFinish, className = '' }, ref) {
  const { species, card, unlocked } = view;
  const GroupIcon = GROUP_ICON[species.group];
  const paws = RARITY_STARS[card.rarity];
  const finish = shownFinish ?? cardFinish(card);
  const name = displayName(species);
  const habitat = species.habitats[0];
  const HabitatIcon = habitat ? habitatIcon(habitat) : undefined;
  const place = discoveryLine(view);
  const first = unlocked ? view.firstObservation : undefined;
  const reference = !photoUrl ? species.media[0] : undefined;
  const anecdote = anecdoteFor(species);

  return (
    <div ref={ref} className={`ax-card-host ${className}`}>
      <div
        className={`ax-card finish-${finish} ${unlocked ? '' : 'is-preview'}`}
        role="img"
        aria-label={`Carte ${name}, ${RARITY_LABELS[card.rarity]}, ${FINISH_LABELS[finish]}, numéro ${card.cardNumber}`}
        data-testid="animodex-card"
      >
        <img className="ax-card__frame" src={frameUrl} alt="" aria-hidden="true" draggable={false} />
        <span className="ax-card__frame-tint" style={frameMask} aria-hidden="true" />
        <div className="ax-card__body">
          <div className="ax-card__banner">
            <span className="ax-card__group" style={groupStyle(species.group)} title={GROUP_SINGULAR[species.group]}>
              <GroupIcon aria-hidden="true" strokeWidth={2.2} />
            </span>
            <div className="ax-card__title">
              <div className={`ax-card__name ${name.length > 13 ? 'is-long' : ''} ${name.length > 20 ? 'is-very-long' : ''}`}>{name}</div>
              {species.frenchName && <div className="ax-card__latin">{species.scientificName}</div>}
            </div>
          </div>

          <div className="ax-card__window">
            {photoUrl ? (
              <img src={photoUrl} alt={`Photo d’observation : ${name}`} />
            ) : reference ? (
              <RefPhoto key={species.id} media={species.media} name={name} placeholder={<GroupIcon aria-hidden="true" />} />
            ) : (
              <div className="ax-card__placeholder">
                <GroupIcon aria-hidden="true" />
                <span>Pas encore de photo</span>
              </div>
            )}
            <div className="ax-card__tint" aria-hidden="true" />
            <div className="ax-card__extra" aria-hidden="true" />
          </div>

          <div className="ax-card__pills">
            {habitat && HabitatIcon && (
              <span className="ax-card__pill is-habitat">
                <i>
                  <HabitatIcon aria-hidden="true" />
                </i>
                <span>{HABITAT_LABELS[habitat]}</span>
              </span>
            )}
            <span className="ax-card__pill is-group" style={groupStyle(species.group)}>
              <i>
                <GroupIcon aria-hidden="true" />
              </i>
              <span>{GROUP_SINGULAR[species.group]}</span>
            </span>
            <span className="ax-card__pill is-seen">
              <i>
                <Binoculars aria-hidden="true" />
              </i>
              <span>{unlocked && view.observationCount > 0 ? `Vu ${view.observationCount} fois` : 'Pas encore vu'}</span>
            </span>
          </div>

          <div className="ax-card__fact">
            <div className="ax-card__fact-title">Le savais-tu ?</div>
            <p>{anecdote}</p>
          </div>

          <div className="ax-card__bottom">
            <span className="ax-card__paws" title={`Rareté de l’espèce : ${RARITY_LABELS[card.rarity]}`}>
              {Array.from({ length: 4 }, (_, i) => (
                <Paw key={i} color={i < paws ? '#ff9a3c' : '#9c9a94'} glow={i < paws} />
              ))}
            </span>
            <span className={`ax-card__stamp ${first ? '' : 'is-empty'}`} title={place}>
              <CalendarDays aria-hidden="true" />
              {first ? (
                <>
                  Vu le
                  <b>{stampDate.format(new Date(first.observedAt))}</b>
                </>
              ) : (
                'À voir'
              )}
            </span>
            <span className="ax-card__number">{card.cardNumber}</span>
          </div>
          {place && <span className="sr-only">{place}</span>}
        </div>
        <div className="ax-card__foil" aria-hidden="true" />
        <div className="ax-card__glare" aria-hidden="true" />
        {!unlocked && <div className="ax-card__ribbon">Aperçu — pas encore découverte</div>}
      </div>
    </div>
  );
});

/** Empreinte de patte : une par niveau de rareté de l'espèce. */
export function Paw({ color, size, glow = false }: { color: string; size?: number; glow?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={glow ? 'is-lit' : undefined}>
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

/**
 * Photo de référence avec secours : certaines photos refusent le mode « CORS » (utile à l'export PNG)
 * ou ne répondent pas. On essaie alors sans CORS, puis la petite taille, puis les autres photos de
 * l'espèce ; en dernier recours, l'icône du groupe plutôt qu'une image cassée.
 */
function RefPhoto({ media, name, placeholder }: { media: SpeciesMedia[]; name: string; placeholder: ReactNode }) {
  const tries = media.flatMap((m) => [
    { m, src: m.url, cors: true },
    { m, src: m.url, cors: false },
    ...(m.thumbnailUrl ? [{ m, src: m.thumbnailUrl, cors: false }] : []),
  ]);
  const [i, setI] = useState(0);
  const t = tries[i];
  if (!t)
    return (
      <div className="ax-card__placeholder">
        {placeholder}
        <span>Photo indisponible</span>
      </div>
    );
  return (
    <>
      <img
        key={`${t.src}-${t.cors}`}
        src={t.src}
        alt={`Photo de référence : ${name}`}
        crossOrigin={t.cors ? 'anonymous' : undefined}
        referrerPolicy="no-referrer"
        onError={() => setI((n) => n + 1)}
      />
      <div className="ax-card__credit">
        Photo de référence : {t.m.creator ?? 'auteur iNaturalist'} · {t.m.license} · {t.m.source}
      </div>
    </>
  );
}
