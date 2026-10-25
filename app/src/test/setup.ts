import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

(globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ = 'test';
(globalThis as { __SINGLE_FILE__?: boolean }).__SINGLE_FILE__ = false;
