import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, apiErrorMessage, fetchJson, resetThrottleForTests } from './http';
import { jsonResponse } from '../../test/inatFixtures';

const schema = z.object({ ok: z.boolean() });
const opts = { source: 'Test', minIntervalMs: 0, timeoutMs: 50 };

afterEach(() => {
  vi.restoreAllMocks();
  resetThrottleForTests();
});

describe('client HTTP des sources', () => {
  it('valide et renvoie la réponse', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    await expect(fetchJson('https://api.test/x', schema, opts)).resolves.toEqual({ ok: true });
  });
  it('rejette une réponse invalide', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ autre: 1 }));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(fetchJson('https://api.test/x', schema, opts)).rejects.toMatchObject({ kind: 'invalid_response' });
  });
  it('signale le quota (429) et les erreurs HTTP', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse({}, 429)).mockResolvedValueOnce(jsonResponse({}, 503));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(fetchJson('https://api.test/x', schema, opts)).rejects.toMatchObject({ kind: 'rate_limited' });
    await expect(fetchJson('https://api.test/x', schema, opts)).rejects.toMatchObject({ kind: 'http', status: 503 });
  });
  it('coupe après le délai d’attente', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_u, init) => new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    );
    await expect(fetchJson('https://api.test/x', schema, opts)).rejects.toMatchObject({ kind: 'timeout' });
  });
  it('ne tente rien hors ligne', async () => {
    const f = vi.spyOn(globalThis, 'fetch');
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(fetchJson('https://api.test/x', schema, opts)).rejects.toMatchObject({ kind: 'offline' });
    expect(f).not.toHaveBeenCalled();
  });
  it('espace les requêtes vers une même source', async () => {
    const times: number[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      times.push(Date.now());
      return jsonResponse({ ok: true });
    });
    await Promise.all([1, 2, 3].map(() => fetchJson('https://api.test/x', schema, { ...opts, minIntervalMs: 40 })));
    expect(times[2] - times[0]).toBeGreaterThanOrEqual(75);
  });
  it('produit des messages compréhensibles', () => {
    expect(apiErrorMessage(new ApiError('offline', 'iNaturalist', ''))).toMatch(/Pas de connexion/);
    expect(apiErrorMessage(new Error('x'))).toMatch(/inattendue/);
  });
});
