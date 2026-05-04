import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

import path from 'node:path';

const normalizeViteBasePath = (basePath: string | undefined) => {
  if (!basePath || basePath === '/') {
    return '/';
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`;
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appEnv = env.VITE_APP_ENV;

  let titleSuffix = '';
  if (appEnv && appEnv.toLowerCase() !== 'production' && appEnv.toLowerCase() !== 'prod') {
    titleSuffix = ` - ${appEnv}`;
  }

  return {
    base: normalizeViteBasePath(env.VITE_BASE_PATH),
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(/<title>(.*?)<\/title>/i, `<title>Verseau 2.0${titleSuffix}</title>`);
        },
      },
    ],
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
  };
});
