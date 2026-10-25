import type { AnimodexType } from '../domain/models';
import { TYPE_LABELS } from '../domain/labels';
import { TYPE_THEME } from './typeTheme';

export function TypeIcon({ type, size = 18 }: { type: AnimodexType; size?: number }) {
  const Icon = TYPE_THEME[type].icon;
  return <Icon size={size} aria-hidden="true" />;
}

/** Pastille de type : icône + texte (l'information ne passe jamais par la seule couleur). */
export function TypeBadge({ type, compact = false }: { type: AnimodexType; compact?: boolean }) {
  const t = TYPE_THEME[type];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ background: `linear-gradient(135deg, ${t.light}, ${t.dark})` }}
    >
      <TypeIcon type={type} size={13} />
      {!compact && TYPE_LABELS[type]}
      {compact && <span className="sr-only">{TYPE_LABELS[type]}</span>}
    </span>
  );
}
