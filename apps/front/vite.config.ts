import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

import path from 'node:path';

const normalizeViteBasePath = (basePath: string | undefined) => {
  if (!basePath || basePath === '/') {
    return '/';
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`;
};

// https://vite.dev/config/
export default defineConfig({
  base: normalizeViteBasePath(process.env.VITE_BASE_PATH),
  plugins: [react()],
  resolve: {
    alias: {
      '@lib/parser': path.resolve(__dirname, '../../packages/parser/src/index.ts'),
      '@lib/dossier': path.resolve(__dirname, '../../packages/dossier/src/index.ts'),
      '@lib/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@lib/parser', '@lib/dossier', '@lib/shared'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
});
