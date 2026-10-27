import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { mockSources } from './inatApi';

/**
 * Version « un seul fichier » (npm run build:single) servie comme sur GitHub Pages,
 * dans un sous-dossier (https://<compte>.github.io/<dépôt>/). Le serveur est simulé.
 */
const FILE = 'dist-single/index.html';

test.skip(!existsSync(FILE), 'lancer `npm run build:single` avant ce test');

test('index.html autonome : fonctionne dans un sous-dossier, routes dans le #', async ({ page }) => {
  await mockSources(page);
  const html = readFileSync(FILE, 'utf8');
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.route('https://pages.example/animodex/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
  await page.goto('https://pages.example/animodex/');
  await expect(page.getByRole('heading', { level: 1, name: 'Animodex', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Explorer' }).click();
  await expect(page).toHaveURL('https://pages.example/animodex/#/explorer');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Explorer', exact: true })).toBeVisible();
  // Tout est dans le fichier : aucune ressource demandée au même serveur à part la page elle-même.
  expect(requests.filter((u) => u.startsWith('https://pages.example/') && !u.endsWith('/animodex/'))).toEqual([]);
});
