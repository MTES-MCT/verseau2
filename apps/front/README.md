
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
