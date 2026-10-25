// Génère les icônes PNG de la PWA à partir de public/favicon.svg (Chromium via Playwright).
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
const targets = [
  ['public/icons/icon-192.png', 192, false],
  ['public/icons/icon-512.png', 512, false],
  ['public/icons/icon-512-maskable.png', 512, true],
  ['public/apple-touch-icon.png', 180, true],
];
for (const [path, size, fullBleed] of targets) {
  // Maskable / Apple : fond plein (pas de coins transparents), contenu dans la zone sûre.
  const inner = fullBleed ? svg.replace('rx="112"', 'rx="0"') : svg;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${fullBleed ? '#0d1512' : 'transparent'}"><div style="width:${size}px;height:${size}px;">${inner.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body></html>`,
  );
  await page.screenshot({ path, omitBackground: !fullBleed });
  console.log('écrit', path);
}
await browser.close();
