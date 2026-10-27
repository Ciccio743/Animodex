import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockSources } from './inatApi';

const PHOTO = 'public/icons/icon-512.png'; // image de test (pas une photo d'animal)
const nav = (page: Page) => page.getByRole('navigation', { name: 'Navigation principale' });

/** Ouvre / ferme la liste « animaux de la zone » en bas d'Explorer. */
const toggleList = (page: Page) => page.getByTestId('explore-sheet').locator('button[aria-expanded]').click();

async function chooseLyon(page: Page) {
  await page.goto('/explorer');
  await page.getByPlaceholder('Un animal ou un lieu…').fill('Lyon');
  await page.getByRole('button', { name: 'Lyon, FR', exact: true }).click();
  await expect(page.getByTestId('explore-sheet')).toContainText('à Lyon, FR');
  await toggleList(page);
  await expect(page.getByTestId('discover-list')).toContainText('Héron cendré');
}

async function recordHeron(page: Page, withPhoto = true) {
  await chooseLyon(page);
  await page.getByRole('link', { name: /Héron cendré/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Héron cendré' })).toBeVisible();
  await page.getByRole('link', { name: 'J’ai vu cet animal' }).click();
  await expect(page.getByTestId('selected-species')).toHaveText('Héron cendré');
  if (withPhoto) {
    await page.getByTestId('photo-input').setInputFiles(PHOTO);
    await expect(page.getByAltText('Photo ajoutée')).toBeVisible();
    await page.getByRole('button', { name: 'Continuer' }).click();
  } else await page.getByRole('button', { name: 'Passer' }).click();
  await page.getByText('Ajouter des détails (facultatif)').click();
  await page.getByLabel('Nom du lieu (facultatif)').fill('Étang du parc');
  await page.getByRole('button', { name: 'Enregistrer l’observation' }).click();
  await expect(page.getByText('Nouvelle carte débloquée !')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockSources(page);
});

test('ouverture, navigation et catalogue vierge', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Animodex' })).toBeVisible();
  await expect(page.getByTestId('home-progress')).toHaveText('0 espèce découverte');
  for (const [label, heading] of [
    ['Explorer', 'Explorer'],
    ['Collection', 'Collection'],
    ['Profil', 'Profil'],
    ['Accueil', 'Animodex'],
  ]) {
    await nav(page).getByRole('link', { name: label }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible();
  }
  await nav(page).getByRole('link', { name: 'Collection' }).click();
  await expect(page.getByText('Ton catalogue est vide')).toBeVisible();
});

test('parcours complet : zone, fiche, observation, carte, rechargement', async ({ page }) => {
  await chooseLyon(page);
  await expect(page.getByTestId('area-source')).toContainText('Données du');
  await expect(page.getByTestId('discover-list')).toContainText('42 obs. — souvent observée dans la zone');
  // Les suggestions ne remplissent pas la collection.
  await nav(page).getByRole('link', { name: 'Collection' }).click();
  await expect(page.getByTestId('stat-species')).toHaveText('0');

  await recordHeron(page);
  const card = page.getByTestId('animodex-card');
  await expect(card).toContainText('Héron cendré');
  await expect(card).toContainText('AX-900001');
  await expect(card).toContainText('Première découverte : Étang du parc');
  await expect(card.getByRole('img', { name: /Photo d’observation/ })).toBeVisible();

  await page.getByRole('link', { name: 'Fiche naturaliste' }).click();
  await expect(page.getByText('Préoccupation mineure')).toBeVisible();
  await expect(page.getByText(/Photographe Test 501/)).toBeVisible();
  await expect(page.getByTestId('species-source')).toContainText('iNaturalist');

  // Revoir une espèce connue n'ajoute pas d'espèce.
  await page.goto('/observations/nouvelle?species=inat-900001');
  await expect(page.getByText(/Déjà dans ta collection/)).toBeVisible();
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.getByRole('button', { name: 'Enregistrer l’observation' }).click();
  // Fiche de l'observation, ou la carte si le tirage a donné une nouvelle sorte de carte.
  await expect(page.getByRole('heading', { level: 1, name: /^(Héron cendré|Carte AX-900001)$/ })).toBeVisible();

  await page.goto('/collection');
  await page.reload();
  await expect(page.getByTestId('stat-species')).toHaveText('1');
  await expect(page.getByTestId('stat-observations')).toHaveText('2');
  await nav(page).getByRole('link', { name: 'Explorer' }).click();
  await expect(page.getByTestId('observations-map')).toBeVisible();
  // Aucune position n'a été placée : rien d'inventé sur la carte, les trouvailles sont listées « Sans position ».
  await expect(page.locator('.ax-pin')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sans position (2)' }).click();
  await expect(page.getByRole('heading', { name: /Sans position/ })).toContainText('(2)');
});

test('carte : la position GPS est placée d’office (exacte), puis la trouvaille apparaît sur la carte', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 45.7640432, longitude: 4.8356591 });
  // La carte est toujours affichée, centrée sur toi (point bleu), même sans trouvaille.
  await page.goto('/carte');
  await expect(page.getByTestId('observations-map').locator('.ax-me')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Me recentrer sur ma position' })).toBeVisible();

  await chooseLyon(page);
  await page.getByRole('link', { name: /Héron cendré/ }).click();
  await page.getByRole('link', { name: 'J’ai vu cet animal' }).click();
  await page.getByRole('button', { name: 'Passer' }).click();
  // La position GPS est prise toute seule ; « Changer » ouvre la carte.
  await expect(page.getByTestId('where-summary')).toContainText('Ta position actuelle');
  await page.getByRole('button', { name: 'Changer' }).nth(1).click();
  await expect(page.getByTestId('pick-map')).toBeVisible();
  await expect(page.getByTestId('picked-position')).toHaveText('Point placé : 45.76404, 4.83566');
  await expect(page.getByTestId('gps-following')).toBeVisible();
  // Le point suit le téléphone tant qu'on ne le déplace pas.
  await context.setGeolocation({ latitude: 45.7650011, longitude: 4.8366022 });
  await expect(page.getByTestId('picked-position')).toHaveText('Point placé : 45.76500, 4.83660');
  await page.getByRole('button', { name: 'Enregistrer l’observation' }).click();
  await expect(page.getByText('Nouvelle carte débloquée !')).toBeVisible();

  await nav(page).getByRole('link', { name: 'Explorer' }).click();
  const map = page.getByTestId('observations-map');
  await expect(map.locator('.ax-pin')).toHaveCount(1);
  await expect(map).toContainText('OpenStreetMap');
  await map.locator('.ax-pin').click();
  await expect(page.getByTestId('map-selection')).toContainText('Héron cendré');
  await expect(page.getByTestId('map-selection')).toContainText('Position exacte');
  await page.reload();
  await expect(page.getByTestId('observations-map').locator('.ax-pin')).toHaveCount(1);
});

test('rencontre passée : date choisie, lieu approximatif posé sur la carte, pas de GPS', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 48.85, longitude: 2.35 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajouter un animal' }).click();
  await page.getByRole('dialog', { name: 'Ajouter un animal' }).getByRole('button', { name: /Animal déjà rencontré/ }).click();
  await expect(page.getByTestId('past-mode')).toBeVisible();
  await page.getByPlaceholder('Tape un nom : merle, héron, Ardea…').fill('merle');
  await page.getByRole('option', { name: /Merle noir/ }).click();
  await expect(page.getByTestId('selected-species')).toHaveText('Merle noir');
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.getByTestId('observed-at').fill('2025-07-14T10:30');
  // Pas de position GPS placée d'office : on ouvre la carte, on cherche le lieu puis on touche la carte.
  await expect(page.getByTestId('where-summary')).toHaveText('Pas de lieu (facultatif)');
  await page.getByRole('button', { name: 'Placer' }).click();
  await expect(page.getByTestId('pick-map')).toBeVisible();
  await expect(page.getByTestId('picked-position')).toHaveCount(0);
  await page.getByPlaceholder('Chercher un lieu : parc, lac, ville…').fill('tete d or');
  await page.getByRole('button', { name: 'Chercher ce lieu' }).click();
  await page.getByRole('button', { name: /Parc de la Tête d’Or/ }).click();
  await page.waitForTimeout(400);
  await page.getByTestId('pick-map').click({ position: { x: 150, y: 120 } });
  await expect(page.getByTestId('picked-position')).toHaveText(/^Point placé : 45\.7\d, 4\.8\d$/);
  await expect(page.getByRole('radio', { name: /Approximative/ })).toBeChecked();
  await page.getByRole('button', { name: 'Enregistrer l’observation' }).click();
  await expect(page.getByText('Nouvelle carte débloquée !')).toBeVisible();

  await nav(page).getByRole('link', { name: 'Explorer' }).click();
  const map = page.getByTestId('observations-map');
  await expect(map.locator('.ax-pin')).toHaveCount(1);
  await map.locator('.ax-pin').click();
  await expect(page.getByTestId('map-selection')).toContainText('Merle noir');
  await expect(page.getByTestId('map-selection')).toContainText('14 juil');
  await expect(page.getByTestId('map-selection')).toContainText('Position approximative');
});

test('carte : « où le trouver ? » colore les secteurs d’observation d’un animal', async ({ page }) => {
  const calls = await mockSources(page);
  await page.goto('/carte');
  await page.getByPlaceholder('Un animal ou un lieu…').fill('merle');
  await page.getByRole('option', { name: /Merle noir/ }).click();
  await expect(page.getByTestId('range-active')).toContainText('Merle noir');
  await expect(page.getByTestId('observations-map')).toContainText('iNaturalist');
  await expect.poll(() => calls['grid:900002']).toBe(1);
  await expect(page).toHaveURL(/espece=900002/);
  await page.getByRole('button', { name: 'Effacer les secteurs' }).click();
  await expect(page.getByTestId('range-active')).toHaveCount(0);

  // Depuis une fiche : bouton « Où le trouver ? ».
  await chooseLyon(page);
  await page.getByRole('link', { name: /Héron cendré/ }).click();
  await page.getByRole('link', { name: 'Où le trouver ?' }).click();
  await expect(page.getByTestId('range-active')).toContainText('Héron cendré');
  await expect.poll(() => calls['grid:900001']).toBe(1);
});

test('bouton « + » : photo existante, ou saisie manuelle', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajouter un animal' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ajouter un animal' });
  await expect(sheet.getByRole('button', { name: /Prendre une photo/ })).toBeVisible();
  await sheet.getByTestId('add-library-input').setInputFiles(PHOTO);
  await expect(page).toHaveURL(/\/observations\/nouvelle$/);
  await expect(page.getByAltText('Photo ajoutée')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Quel animal as-tu vu ?' })).toBeVisible();

  await page.getByRole('button', { name: 'Ajouter un animal' }).click();
  await page.getByRole('dialog', { name: 'Ajouter un animal' }).getByRole('button', { name: /Noter à la main/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Quel animal as-tu vu ?' })).toBeVisible();
  await expect(page.getByAltText('Photo ajoutée')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ajouter un animal' }).click();
  await page.getByRole('dialog', { name: 'Ajouter un animal' }).getByRole('button', { name: /Animal déjà rencontré/ }).click();
  await expect(page.getByTestId('past-mode')).toBeVisible();
});

test.describe(() => {
  // Le service worker garderait en cache l'échec du premier chargement : on teste ici le fond seul.
  test.use({ serviceWorkers: 'block' });
  test('carte : fond « jeu » vectoriel, et fond OSM de secours s’il ne charge pas', async ({ page }) => {
    await page.goto('/carte');
    await expect(page.getByTestId('observations-map')).toHaveAttribute('data-basemap', 'raster');
    await expect(page.getByTestId('observations-map')).toContainText('OpenStreetMap');

    await mockSources(page, { vectorBasemap: true });
    await page.reload();
    await expect(page.getByTestId('observations-map')).toHaveAttribute('data-basemap', 'vector');
    await expect(page.getByTestId('observations-map').locator('canvas.maplibregl-canvas')).toHaveCount(1);
    await expect(page.getByTestId('observations-map')).toContainText('OpenFreeMap');
  });
});

test('carte : chercher un lieu puis toucher la carte pour placer le point', async ({ page }) => {
  await page.goto('/observations/nouvelle?taxon=900001');
  await expect(page.getByTestId('selected-species')).toHaveText('Héron cendré');
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.getByRole('button', { name: 'Placer' }).click();
  await page.getByPlaceholder('Chercher un lieu : parc, lac, ville…').fill('tete d or');
  await page.getByRole('button', { name: 'Chercher ce lieu' }).click();
  await page.getByRole('button', { name: /Parc de la Tête d’Or/ }).click();
  const map = page.getByTestId('pick-map');
  await expect(map).toBeVisible();
  await expect(page.getByTestId('picked-position')).toHaveCount(0); // chercher ne place rien tout seul
  await map.click({ position: { x: 150, y: 120 } });
  await expect(page.getByTestId('picked-position')).toContainText('Point placé : 45.7');
  await page.getByRole('button', { name: 'Retirer' }).click();
  await expect(page.getByTestId('picked-position')).toHaveCount(0);
});

test('recherche d’espèce en ligne depuis le formulaire', async ({ page }) => {
  await page.goto('/observations/nouvelle');
  await page.getByPlaceholder('Tape un nom : merle, héron, Ardea…').fill('merle');
  await page.getByRole('option', { name: /Merle noir/ }).click();
  await expect(page.getByTestId('selected-species')).toHaveText('Merle noir');
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.getByText('Ajouter des détails (facultatif)').click();
  await page.getByLabel('Je ne suis pas sûr de l’espèce').check();
  await page.getByRole('button', { name: 'Enregistrer l’observation' }).click();
  await expect(page.getByText('Cette observation ne débloque pas encore de carte')).toBeVisible();
  await page.goto('/collection');
  await expect(page.getByTestId('stat-species')).toHaveText('0');
  await expect(page.getByTestId('stat-catalog')).toHaveText('1');
});

test('observation à identifier puis suppression', async ({ page }) => {
  await page.goto('/observations/nouvelle');
  await page.getByRole('button', { name: 'Je ne sais pas encore' }).click();
  await page.getByRole('button', { name: 'Passer' }).click();
  await page.getByRole('button', { name: 'Enregistrer l’observation' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Animal à identifier' })).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Collection' })).toBeVisible();
  await expect(page.getByTestId('stat-observations')).toHaveText('0');
});

test('export JSON puis import sur un appareil vierge et hors réseau', async ({ page, browser }) => {
  await recordHeron(page);
  await page.goto('/profil');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter toutes mes données (JSON)' }).click();
  const file = await (await download).path();
  await expect(page.getByTestId('last-backup')).not.toHaveText('Dernière sauvegarde : jamais');
  const json = JSON.parse(await readFile(file!, 'utf8'));
  expect(json.schemaVersion).toBe(2);
  expect(json.data.species.map((s: { id: string }) => s.id)).toContain('inat-900001');

  // Autre navigateur, sans aucune API joignable : la sauvegarde suffit à tout restaurer.
  const ctx = await browser.newContext();
  await ctx.route('https://**', (r) => r.abort());
  const fresh = await ctx.newPage();
  await fresh.goto('/profil');
  await fresh.getByTestId('backup-input').setInputFiles({ name: 'faux.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"autre"}') });
  await expect(fresh.getByText('Fichier refusé')).toBeVisible();
  await fresh.getByTestId('backup-input').setInputFiles(file!);
  await expect(fresh.getByTestId('import-preview')).toContainText('Observations : 1 nouvelle');
  await fresh.getByRole('button', { name: 'Fusionner' }).click();
  await expect(fresh.getByText('Sauvegarde fusionnée')).toBeVisible();
  await fresh.goto('/cartes/inat-900001');
  await expect(fresh.getByTestId('animodex-card')).toContainText('AX-900001');
  await expect(fresh.getByTestId('animodex-card').getByRole('img', { name: /Photo d’observation/ })).toBeVisible();
  await ctx.close();
});

test('export PNG d’une carte', async ({ page }) => {
  await recordHeron(page, false);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter PNG' }).click();
  const d = await download;
  expect(d.suggestedFilename()).toBe('animodex-AX-900001-inat-900001.png');
  const buf = await readFile((await d.path())!);
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  expect(buf.length).toBeGreaterThan(20_000);
});

test('découverte surprise : n’ajoute rien à la collection', async ({ page }) => {
  await chooseLyon(page);
  await toggleList(page);
  await page.getByRole('button', { name: 'Découverte surprise' }).click();
  await expect(page.getByText('Découverte surprise — animal à rechercher')).toBeVisible();
  await page.goto('/collection');
  await expect(page.getByTestId('stat-species')).toHaveText('0');
});

test('erreur d’API : message clair et nouvel essai', async ({ page }) => {
  await page.context().unrouteAll();
  await mockSources(page, { speciesCountsStatus: 503 });
  await page.goto('/explorer');
  await page.getByPlaceholder('Un animal ou un lieu…').fill('Lyon');
  await page.getByRole('button', { name: 'Lyon, FR', exact: true }).click();
  await toggleList(page);
  await expect(page.getByRole('alert')).toContainText('iNaturalist est indisponible');
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible();
});

test('PWA : manifeste et service worker', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Animodex');
  expect(manifest.short_name).toBe('Animodex');
  await page.goto('/');
  expect(await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active)).toBe(true);
});

test('hors ligne : collection et liste de zone en cache restent consultables', async ({ page, context }) => {
  await recordHeron(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.goto('/collection');
  await expect(page.getByText('Hors ligne')).toBeVisible();
  await expect(page.getByTestId('stat-species')).toHaveText('1');
  await nav(page).getByRole('link', { name: 'Explorer' }).click();
  await toggleList(page);
  await expect(page.getByTestId('discover-list')).toContainText('Héron cendré');
  await expect(page.getByTestId('area-source')).toContainText('cache');
  await context.setOffline(false);
});
