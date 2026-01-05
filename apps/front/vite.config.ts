import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@lib/parser': path.resolve(__dirname, '../../packages/parser/src/index.ts'),
      '@lib/dossier': path.resolve(__dirname, '../../packages/dossier/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['@lib/parser'],
    exclude: ['@lib/dossier'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
});
