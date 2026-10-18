/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    // No inline <script>/<style> so the strict CSP (script-src 'self') holds.
    assetsInlineLimit: 0,
    // The SSR build (dist-ssr/, see scripts/prerender.mjs) only renders HTML; public/ belongs to dist/.
    copyPublicDir: !isSsrBuild,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}));
