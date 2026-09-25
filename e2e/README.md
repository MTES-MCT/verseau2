# Cypress / Gherkin E2E

Run from the repository root with Node 24, pnpm 12, Docker and a Cypress-supported desktop runtime (macOS, Windows or glibc-based Linux):

```sh
pnpm install
pnpm test:e2e
pnpm test:e2e:open  # interactive Cypress, same isolated stack
```

The runner starts an isolated PostgreSQL 16 database and S3 emulator, builds the backend, seeds the referential and mock-OIDC user, then launches the real API, pg-boss worker and Vite frontend. It stops its own processes and Compose project after Cypress exits. Ports 3000, 5173, 54329 and 9099 must be free. It does not use the developer's database or `.env.local` values for the configured test services. External OIDC, SFTP, email and SANDRE calls use development adapters.

`pnpm test:e2e` starts both backend processes. Look for `[e2e] Starting backend API` and `[e2e] Starting backend worker` in the terminal; their startup output is also saved under `artifacts/logs/`. If the runner stops before those messages, the reported Docker, build, or seed step failed first. `pnpm --filter e2e cypress:run` runs only Cypress against a stack that you have already started.

The runner requires ports 3000 and 5173 to be unused before starting. An existing backend on port 3000 could otherwise answer the readiness check while the new backend fails to bind, leaving the isolated E2E database without application tables. If the port check fails, stop the existing app (for example, inspect the listener with `lsof -nP -iTCP:3000 -sTCP:LISTEN`) and rerun.

Tests are written in French Gherkin under `features/`. Feature-local steps live beside each `.feature`; shared steps belong in `support/step_definitions/`. Use `cy.login()` to establish a signed mock-OIDC session. To debug a running stack, use `pnpm --filter e2e cypress:run`; use `pnpm --filter e2e check` to check TypeScript. Failure logs, Cucumber HTML, videos and screenshots are under `artifacts/`.
