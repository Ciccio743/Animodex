import { Link } from 'react-router';
import { Lock, Sparkles } from 'lucide-react';
import { GROUP_ICON } from '../../components/typeTheme';
import { usePhotoUrl } from '../../hooks/useData';
import type { CardView } from './cardView';
import { displayName } from '../../domain/models';
import { cardFinish } from '../../domain/cards';
import { FINISH_LABELS, type CardFinish } from '../../domain/finishes';
import { RARITY_LABELS, RARITY_STARS } from '../../domain/labels';
import { groupStyle } from './cardTheme';
import { Paw } from './AnimodexCardView';

/** Vignette de collection, lisible à petite taille, aux couleurs de la finition de la carte. */
export function MiniCard({ view, pending = false, finish: shownFinish }: { view: CardView; pending?: boolean; finish?: CardFinish }) {
  const { species, card, unlocked } = view;
  const ownPhoto = usePhotoUrl(unlocked ? view.lastObservation?.photoIds[0] : undefined);
  const photoUrl = ownPhoto ?? species.media[0]?.thumbnailUrl;
  const name = displayName(species);
  const GroupIcon = GROUP_ICON[species.group];
  const finish = shownFinish ?? cardFinish(card);
  const paws = RARITY_STARS[card.rarity];
  return (
    <Link
      to={unlocked ? `/cartes/${species.id}${shownFinish ? `?version=${shownFinish}` : ''}` : `/especes/${species.id}`}
      className={`ax-mini ${unlocked ? `finish-${finish}` : 'is-locked'} block`}
      aria-label={`${name}${unlocked ? `, finition ${FINISH_LABELS[finish]}` : ' (pas encore découverte)'}`}
    >
      <div className="ax-mini__inner">
        <div className="ax-mini__window">
          {photoUrl ? (
            <img src={photoUrl} alt="" className={unlocked ? '' : 'opacity-40 grayscale'} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <GroupIcon size={30} className="text-[#9a7a55] opacity-60" aria-hidden="true" />
          )}
          <span className="ax-mini__group" style={groupStyle(species.group)} aria-hidden="true">
            {unlocked ? <GroupIcon size={12} strokeWidth={2.5} /> : <Lock size={10} />}
          </span>
          {pending && !unlocked && (
            <span className="absolute bottom-1 left-1 rounded bg-amber-400/90 px-1.5 text-[10px] font-bold text-black">à confirmer</span>
          )}
        </div>
        <div className="ax-mini__name">{name}</div>
        {unlocked ? (
          <div className="ax-mini__meta">
            <span className="flex" title={RARITY_LABELS[card.rarity]}>
              {Array.from({ length: 4 }, (_, i) => (
                <Paw key={i} size={8} color={i < paws ? '#ff7a45' : '#d8cfbd'} />
              ))}
            </span>
            <span className="flex min-w-0 items-center gap-0.5 truncate">
              <Sparkles size={8} className="flex-none" aria-hidden="true" />
              {FINISH_LABELS[finish]}
            </span>
          </div>
        ) : (
          <span className="text-center text-[10px]">Pas encore vue · {card.cardNumber}</span>
        )}
      </div>
    </Link>
  );
}
