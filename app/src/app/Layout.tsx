import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Compass, House, LayoutGrid, Map, Plus, User, WifiOff } from 'lucide-react';
import { useData, useOnline } from '../hooks/useData';
import { UpdatePrompt } from './UpdatePrompt';
import { AddSheet } from './AddSheet';

const TABS = [
  { to: '/', label: 'Accueil', icon: House, end: true },
  { to: '/decouvrir', label: 'Découvrir', icon: Compass },
  { to: '/carte', label: 'Map', icon: Map },
  { to: '/collection', label: 'Collection', icon: LayoutGrid },
  { to: '/profil', label: 'Profil', icon: User },
];

function renderTab({ to, label, icon: Icon, end }: (typeof TABS)[number]) {
  return (
    <li key={to}>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${isActive ? 'text-moss-300' : 'text-white/60'}`
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
            {label}
          </>
        )}
      </NavLink>
    </li>
  );
}

export function Layout() {
  const online = useOnline();
  const { status, error } = useData();
  const { pathname } = useLocation();
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:p-2 focus:text-black">
        Aller au contenu
      </a>
      {!online && (
        <div className="no-print sticky top-0 z-30 flex items-center gap-2 bg-amber-500/90 px-4 py-2 pt-[calc(var(--safe-top)+0.5rem)] text-sm font-medium text-black" role="status">
          <WifiOff size={16} aria-hidden="true" /> Hors ligne : ta collection locale reste disponible.
        </div>
      )}
      <main id="main" className="flex-1 px-4 pb-[calc(6rem+var(--safe-bottom))] pt-[calc(var(--safe-top)+0.75rem)]">
        {status === 'error' ? (
          <div className="surface mt-10 p-6 text-center">
            <p className="font-display text-lg font-bold">Le stockage local est indisponible</p>
            <p className="mt-2 text-sm text-white/70">
              Animodex a besoin d’IndexedDB pour conserver ta collection. Vérifie que la navigation privée n’est pas activée. ({error})
            </p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <UpdatePrompt />
      <nav
        aria-label="Navigation principale"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night-950/90 pb-[var(--safe-bottom)] backdrop-blur-lg"
      >
        {/* Deux moitiés de même largeur : le bouton + reste pile au centre de l'écran. */}
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_auto_1fr] items-end">
          <ul className="grid grid-cols-2">{TABS.slice(0, 2).map(renderTab)}</ul>
          <div className="flex justify-center px-1">
            <button
              type="button"
              onClick={() => setAdding(true)}
              aria-label="Ajouter un animal"
              aria-haspopup="dialog"
              className="-mt-6 mb-2 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-b from-moss-300 to-moss-500 text-night-950 shadow-[0_6px_20px_rgb(95_191_106_/_0.55)] ring-4 ring-night-950 active:scale-95"
            >
              <Plus size={34} strokeWidth={2.8} aria-hidden="true" />
            </button>
          </div>
          <ul className="grid grid-cols-3">{TABS.slice(2).map(renderTab)}</ul>
        </div>
      </nav>
      {adding && <AddSheet onClose={() => setAdding(false)} />}
    </div>
  );
}
