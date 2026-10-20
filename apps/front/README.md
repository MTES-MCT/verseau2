## Environment identifier

Set `VITE_APP_ENV` at build time (for example, `staging`, `Recette`, or `development`). Non-production environments display their name as a small, faint, diagonal watermark repeated across the whole app, including the header and footer. It is painted as a background behind all content, not as an overlay; opaque controls and cards naturally cover it. The pattern stays fixed while scrolling, adapts to light/dark themes, and the environment is announced once to screen readers.

When `VITE_APP_ENV` is unset or blank, `App` bypasses `EnvironmentWatermark` entirely, including in local development. Set `VITE_APP_ENV=development` explicitly to display `Développement`. Values `production` / `prod` (case-insensitive) also display no watermark. The existing browser-tab environment suffix is unchanged.

## Sentry

Client-side error reporting is disabled unless `VITE_SENTRY_DSN` is set.

Runtime variables exposed to the browser:

- `VITE_SENTRY_DSN`: Sentry DSN for the frontend project.
- `VITE_APP_ENV`: deployment environment name.
- `VITE_SENTRY_RELEASE`: release identifier associated with the deployed frontend.

Build-only variables for sourcemap upload, without the `VITE_` prefix:

- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_RELEASE`: same release identifier as `VITE_SENTRY_RELEASE`.

Production builds fail when `VITE_SENTRY_DSN` is set without the Sentry upload variables. Sourcemaps are generated in hidden mode, uploaded by the Sentry Vite plugin, then deleted from `dist` after upload.
