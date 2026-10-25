import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Applications Android et iOS (Capacitor) : elles embarquent la version web construite dans `dist/`.
 * appId = identifiant définitif sur les stores : à confirmer AVANT la première publication.
 * Procédure complète : docs/STORE_RELEASE.md
 */
const config: CapacitorConfig = {
  appId: 'com.animodex.app',
  appName: 'Animodex',
  webDir: 'dist',
  backgroundColor: '#0d1512',
  ios: { contentInset: 'never' },
};

export default config;
