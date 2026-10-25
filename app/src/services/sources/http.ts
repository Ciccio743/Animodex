import type { z } from 'zod';

export type ApiErrorKind = 'offline' | 'timeout' | 'rate_limited' | 'http' | 'invalid_response' | 'network';

/** Erreur d'API typée, avec un message compréhensible pour l'interface. */
export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    public source: string,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export function apiErrorMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Erreur inattendue. Réessaie plus tard.';
  switch (e.kind) {
    case 'offline':
      return `Pas de connexion : ${e.source} est indisponible. Tes données enregistrées restent consultables.`;
    case 'timeout':
      return `${e.source} met trop de temps à répondre. Réessaie dans un instant.`;
    case 'rate_limited':
      return `${e.source} limite le nombre de requêtes. Patiente une minute avant de réessayer.`;
    case 'invalid_response':
      return `Réponse inattendue de ${e.source} : rien n’a été enregistré.`;
    default:
      return `${e.source} est indisponible pour le moment (${e.status ?? 'réseau'}).`;
  }
}

interface Limiter {
  next: number;
}
const limiters = new Map<string, Limiter>();

/** Espace les requêtes vers un même service (file d'attente simple, sans parallélisme). */
async function throttle(key: string, minIntervalMs: number): Promise<void> {
  const l = limiters.get(key) ?? { next: 0 };
  limiters.set(key, l);
  const now = Date.now();
  const wait = Math.max(0, l.next - now);
  l.next = Math.max(now, l.next) + minIntervalMs;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export interface FetchOptions {
  source: string;
  timeoutMs?: number;
  minIntervalMs?: number;
  signal?: AbortSignal;
}

/** GET JSON avec délai d'attente, limitation de débit, validation et erreurs typées. */
export async function fetchJson<T>(url: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, opts: FetchOptions): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new ApiError('offline', opts.source, 'hors ligne');
  await throttle(opts.source, opts.minIntervalMs ?? 1000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12_000);
  opts.signal?.addEventListener('abort', () => controller.abort(), { once: true });
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    if (controller.signal.aborted && !opts.signal?.aborted) throw new ApiError('timeout', opts.source, 'délai dépassé');
    if (opts.signal?.aborted) throw e;
    throw new ApiError('network', opts.source, 'réseau');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new ApiError('rate_limited', opts.source, 'quota', 429);
  if (!res.ok) {
    // Journalisation minimale : chemin seulement, jamais les paramètres (coordonnées).
    console.warn(`[${opts.source}] HTTP ${res.status} ${new URL(url).pathname}`);
    throw new ApiError('http', opts.source, `HTTP ${res.status}`, res.status);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ApiError('invalid_response', opts.source, 'JSON invalide');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.warn(`[${opts.source}] réponse invalide ${new URL(url).pathname}`, parsed.error.issues.slice(0, 3));
    throw new ApiError('invalid_response', opts.source, 'réponse invalide');
  }
  return parsed.data;
}

/** Réservé aux tests. */
export function resetThrottleForTests(): void {
  limiters.clear();
}
