/** Notification minimale « les données locales ont changé », pour rafraîchir les écrans. */
type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export function notifyDataChanged(): void {
  version++;
  for (const l of listeners) l();
}

export function subscribeDataChanged(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getDataVersion(): number {
  return version;
}
