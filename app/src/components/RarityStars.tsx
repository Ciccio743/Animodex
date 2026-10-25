import { Star } from 'lucide-react';
import type { Rarity } from '../domain/models';
import { RARITY_LABELS, RARITY_STARS } from '../domain/labels';

export function RarityStars({ rarity, size = 14, withLabel = false }: { rarity: Rarity; size?: number; withLabel?: boolean }) {
  const n = RARITY_STARS[rarity];
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${RARITY_LABELS[rarity]}, ${n} étoile${n > 1 ? 's' : ''}`}>
      <span className="inline-flex" aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <Star key={i} size={size} className="fill-gold-300 text-gold-500" />
        ))}
      </span>
      {withLabel && <span className="text-xs font-semibold">{RARITY_LABELS[rarity]}</span>}
    </span>
  );
}
