import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center gap-2 px-6 py-8 text-center">
      <Icon size={36} className="text-moss-300" aria-hidden="true" />
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="text-sm text-white/70">{children}</div>}
    </div>
  );
}
