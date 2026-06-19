
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
