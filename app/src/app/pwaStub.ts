/**
 * Version « un seul fichier » (index.html autonome) : pas de service worker possible,
 * donc pas d'invite de mise à jour. Remplace `virtual:pwa-register/react` dans ce mode.
 */
export function useRegisterSW() {
  const noop = () => undefined;
  return { needRefresh: [false, noop] as const, offlineReady: [false, noop] as const, updateServiceWorker: async () => undefined };
}
