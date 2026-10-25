/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

/** Icônes de public/ intégrées en data URI dans index.html (mode « un seul fichier »). */
function inlinePublicIcons(): Plugin {
  const dataUri = (file: string, mime: string) => `data:${mime};base64,${readFileSync(new URL(`./public/${file}`, import.meta.url)).toString('base64')}`;
  return {
    name: 'animodex-inline-icons',
    transformIndexHtml: (html) =>
      html
        .replace('href="/favicon.svg"', `href="${dataUri('favicon.svg', 'image/svg+xml')}"`)
        .replace('href="/apple-touch-icon.png"', `href="${dataUri('apple-touch-icon.png', 'image/png')}"`),
  };
}

// `vite build --mode single` : un index.html autonome (GitHub Pages, ouverture directe), sans service worker.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __SINGLE_FILE__: JSON.stringify(single) },
  publicDir: single ? false : 'public',
  build: single ? { outDir: 'dist-single', emptyOutDir: true } : undefined,
  resolve: single ? { alias: { 'virtual:pwa-register/react': fileURLToPath(new URL('./src/app/pwaStub.ts', import.meta.url)) } } : undefined,
  plugins: [
    react(),
    tailwindcss(),
    ...(single ? [viteSingleFile(), inlinePublicIcons()] : []),
    !single && VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifestFilename: 'manifest.webmanifest',
      manifest: {
        name: 'Animodex',
        short_name: 'Animodex',
        description: "Découvre, observe et collectionne les animaux réels.",
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0d1512',
        theme_color: '#0d1512',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-wght-normal-*.woff2'],
        navigateFallback: '/index.html',
        // Photos de référence iNaturalist : mises en cache à l'affichage (pas de téléchargement massif).
        runtimeCaching: [
          // Fond « jeu » vectoriel (OpenFreeMap) : tuiles et polices déjà affichées gardées en cache.
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'game-tiles',
              expiration: { maxEntries: 1500, maxAgeSeconds: 14 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Fond de carte OSM : seules les tuiles déjà affichées sont gardées (pas de téléchargement massif).
          {
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'base-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 14 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/(inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)\/photos\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'inat-photos',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  };
});
