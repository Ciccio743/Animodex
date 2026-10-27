import { Link } from 'react-router';
import { Lock, Sparkles } from 'lucide-react';
import { GROUP_ICON } from '../../components/typeTheme';
import { usePhotoUrl } from '../../hooks/useData';
import type { CardView } from './cardView';
import { displayName } from '../../domain/models';
import { cardFinish } from '../../domain/cards';
import { FINISH_LABELS, type CardFinish } from '../../domain/finishes';
import { RARITY_LABELS, RARITY_STARS } from '../../domain/labels';
import { groupStyle, landStyle } from './cardTheme';
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
      style={landStyle(species.habitats)}
      aria-label={`${name}${unlocked ? `, finition ${FINISH_LABELS[finish]}` : ' (pas encore découverte)'}`}
    >
      <div className="ax-mini__inner">
        <div className="ax-mini__scene relative grid aspect-[4/3] place-items-center">
          <span
            className="absolute left-1 top-1 grid size-6 place-items-center rounded-full border-2 border-[#f3d27a] text-white"
            style={{ ...groupStyle(species.group), background: 'radial-gradient(circle at 35% 30%, var(--g-light), var(--g-dark))' }}
            aria-hidden="true"
          >
            {unlocked ? <GroupIcon size={13} strokeWidth={2.5} /> : <Lock size={11} />}
          </span>
          <div className="grid aspect-square h-[76%] place-items-center overflow-hidden rounded-full border-[3px] border-white bg-[#ffe9cf] shadow-md">
            {photoUrl ? (
              <img src={photoUrl} alt="" className={`h-full w-full object-cover ${unlocked ? '' : 'opacity-40 grayscale'}`} loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <GroupIcon size={30} className="text-[#9a7a55] opacity-60" aria-hidden="true" />
            )}
          </div>
          {pending && !unlocked && (
            <span className="absolute bottom-1 left-1 rounded bg-amber-400/90 px-1.5 text-[10px] font-bold text-black">à confirmer</span>
          )}
        </div>
        <div className="px-2 pb-2 pt-1 font-[family-name:var(--font-card)]">
          <div className={`truncate font-[family-name:var(--font-card-title)] text-[14px] font-semibold ${unlocked ? '' : 'opacity-70'}`}>{name}</div>
          {unlocked ? (
            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-[#6b5a48]">
              <span className="flex" title={RARITY_LABELS[card.rarity]}>
                {Array.from({ length: 4 }, (_, i) => (
                  <Paw key={i} size={11} color={i < paws ? '#ff7a45' : '#e3dccd'} />
                ))}
              </span>
              <span className="flex items-center gap-0.5">
                <Sparkles size={10} aria-hidden="true" />
                {FINISH_LABELS[finish]}
              </span>
            </div>
          ) : (
            <span className="text-[11px]">Pas encore vue · {card.cardNumber}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
