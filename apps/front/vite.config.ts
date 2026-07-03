import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

import path from 'node:path';

const normalizeViteBasePath = (basePath: string | undefined) => {
  if (!basePath || basePath === '/') {
    return '/';
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}/`;
};

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appEnv = env.VITE_APP_ENV;
  const sentryRelease = env.SENTRY_RELEASE || env.VITE_SENTRY_RELEASE;
  const hasSentryUploadConfig = Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT);

  if (command === 'build' && env.VITE_SENTRY_DSN && !hasSentryUploadConfig) {
    const missingVariables = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'].filter((name) => !env[name]);

    throw new Error(
      `VITE_SENTRY_DSN is set, but Sentry sourcemap upload is not configured. Missing: ${missingVariables.join(', ')}`,
    );
  }

  const shouldUploadSourcemaps = command === 'build' && hasSentryUploadConfig;

  let titleSuffix = '';
  if (appEnv && appEnv.toLowerCase() !== 'production' && appEnv.toLowerCase() !== 'prod') {
    titleSuffix = ` - ${appEnv}`;
  }

  return {
    server: {
      host: true, // Listens on all addresses
      allowedHosts: ['host.docker.internal'], // Allows the docker container to connect
    },
    base: normalizeViteBasePath(env.VITE_BASE_PATH),
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(/<title>(.*?)<\/title>/i, `<title>Verseau 2.0${titleSuffix}</title>`);
        },
      },
      shouldUploadSourcemaps
        ? sentryVitePlugin({
            authToken: env.SENTRY_AUTH_TOKEN,
            org: env.SENTRY_ORG,
            project: env.SENTRY_PROJECT,
            release: sentryRelease ? { name: sentryRelease, inject: true } : { inject: true },
            sourcemaps: {
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
          })
        : undefined,
    ],
    build: {
      sourcemap: 'hidden',
    },
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
      onConsoleLog: () => false,
      setupFiles: './vitest.setup.ts',
      silent: true,
    },
  };
});
