import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { GROUP_ICON, typeStyle } from '../../components/typeTheme';
import { TypeIcon } from '../../components/TypeIcon';
import { RarityStars } from '../../components/RarityStars';
import { usePhotoUrl } from '../../hooks/useData';
import type { CardView } from './cardView';
import { displayName } from '../../domain/models';

/** Vignette de collection, lisible à petite taille. */
export function MiniCard({ view, pending = false }: { view: CardView; pending?: boolean }) {
  const { species, card, unlocked } = view;
  const ownPhoto = usePhotoUrl(unlocked ? view.lastObservation?.photoIds[0] : undefined);
  const photoUrl = ownPhoto ?? species.media[0]?.thumbnailUrl;
  const name = displayName(species);
  const GroupIcon = GROUP_ICON[species.group];
  return (
    <Link
      to={unlocked ? `/cartes/${species.id}` : `/especes/${species.id}`}
      className={`ax-mini rarity-${card.rarity} ${unlocked ? '' : 'is-locked'} block`}
      style={typeStyle(card.primaryType)}
      aria-label={`${name}${unlocked ? '' : ' (pas encore découverte)'}`}
    >
      <div className="ax-mini__inner">
        <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] font-bold">
          <span className="flex items-center gap-1">
            {unlocked ? <TypeIcon type={card.primaryType} size={13} /> : <Lock size={12} aria-hidden="true" />}
            {card.cardNumber}
          </span>
          {unlocked && <span>{card.baseHp} PV</span>}
        </div>
        <div className="relative mx-1.5 mt-1 grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-black/30">
          {photoUrl ? (
            <img src={photoUrl} alt="" className={`h-full w-full object-cover ${unlocked ? '' : 'opacity-40 grayscale'}`} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <GroupIcon size={34} className="opacity-50" aria-hidden="true" />
          )}
          {pending && !unlocked && (
            <span className="absolute bottom-1 left-1 rounded bg-amber-400/90 px-1.5 text-[10px] font-bold text-black">à confirmer</span>
          )}
        </div>
        <div className="px-2 pb-2 pt-1">
          <div className={`truncate text-[13px] font-semibold ${unlocked ? '' : 'opacity-70'}`}>{name}</div>
          {unlocked ? <RarityStars rarity={card.rarity} size={11} /> : <span className="text-[11px]">Pas encore vue</span>}
        </div>
      </div>
    </Link>
  );
}
