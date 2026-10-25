import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: ReactNode; back?: boolean; action?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="no-print flex items-start gap-2 pb-4 pt-2">
      {back && (
        <button type="button" className="btn btn-ghost -ml-3 px-3" onClick={() => navigate(-1)} aria-label="Retour">
          <ChevronLeft size={24} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[1.75rem] font-bold leading-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-white/70">{subtitle}</div>}
      </div>
      {action}
    </header>
  );
}
