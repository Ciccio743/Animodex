import { Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

/** Bandeau d'information honnête (fonction indisponible, données à vérifier…). */
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  const Icon = tone === 'warning' ? TriangleAlert : Info;
  return (
    <div
      className={`flex gap-3 rounded-2xl px-4 py-3 text-sm ${tone === 'warning' ? 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30' : 'bg-lagoon-500/15 text-sky-100 ring-1 ring-sky-300/20'}`}
      role="note"
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
