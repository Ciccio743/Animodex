import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import cardBackUrl from '../../assets/card-back.webp';
import type { CardFinish } from '../../domain/finishes';

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Carte en 3D : elle penche en suivant le doigt (ou la souris), les reflets bougent avec elle,
 * et un toucher la retourne pour montrer le dos Animodex.
 */
export function CardFlip({ finish, children }: { finish: CardFinish; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [tilting, setTilting] = useState(false);
  const frame = useRef(0);

  function setVars(vars: Record<string, string>) {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    });
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (reduceMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!tilting) setTilting(true);
    setVars({
      '--ry': `${((x - 0.5) * 30).toFixed(1)}deg`,
      '--rx': `${((0.5 - y) * 24).toFixed(1)}deg`,
      '--mx': `${Math.round(x * 100)}%`,
      '--my': `${Math.round(y * 100)}%`,
    });
  }

  function onLeave() {
    setTilting(false);
    setVars({ '--ry': '0deg', '--rx': '0deg', '--mx': '30%', '--my': '25%' });
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFlipped((f) => !f);
    }
  }

  return (
    <div
      ref={ref}
      className={`ax-flip finish-${finish} ${flipped ? 'is-flipped' : ''} ${tilting ? 'is-tilting' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={flipped ? 'Retourner la carte côté face' : 'Retourner la carte pour voir le dos'}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={onKey}
      data-testid="card-flip"
    >
      <div className="ax-flip__inner">
        <div className="ax-flip__face ax-flip__front">{children}</div>
        <div className="ax-flip__face ax-flip__back" aria-hidden={!flipped}>
          <img src={cardBackUrl} alt="Dos de carte Animodex" draggable={false} />
        </div>
      </div>
    </div>
  );
}
