# Verseau2 - AI Coding Agent Instructions

## Project Overview
Verseau2 is a wastewater monitoring file submission system (French government project). It's a TypeScript monorepo with a NestJS backend and React frontend, handling SANDRE XML file processing for wastewater treatment plant monitoring.

## Architecture

### Monorepo Structure
- **apps/back**: NestJS API with dual-process architecture (HTTP server + async worker)
- **apps/front**: React + Vite app using French government Design System (DSFR)
- **packages/dossier**: Shared types/DTOs between frontend and backend
- **packages/parser**: SANDRE XML parser using SAX

### Critical: Dual Backend Architecture
Backend runs as TWO separate Node processes:
1. **Server** ([apps/back/src/mainServer.ts](../apps/back/src/mainServer)): HTTP API on port 3000
2. **Worker** ([apps/back/src/mainWorker.ts](../apps/back/src/mainWorker)): Background job processor

Both connect to the same PostgreSQL database and use `pg-boss` for queue management. Start both in dev with `npm run dev:back` (uses concurrent nodemon configs).

### Gateway/Repository Pattern
All data access uses Port/Adapter pattern:
- **Gateway**: Interface/port (e.g., `RoseauGateway` - use Symbol export pattern)
- **Repository**: TypeORM implementation (e.g., `RoseauRepository`)
- Register in modules: `{ provide: XGateway, useClass: XRepository }`
- See [apps/back/src/referentiel/roseau](../apps/back/src/referentiel/roseau) for examples

### Path Aliases
Backend uses extensive tsconfig path mappings:
```typescript
@dossier/* → src/dossier/*
@infra/* → src/infra/*
@shared/* → src/shared/*
@queue/* → src/infra/queue/*
@s3/* → src/infra/s3/*
// etc. - see apps/back/tsconfig.json
```
Jest configs mirror these paths. Always use aliases, never relative imports across modules.

## Key Workflows

### Development Commands
```bash
# Root: Start everything
npm run dev  # Starts backend (server+worker) and frontend concurrently

# Backend only
npm run dev:back  # Runs both server and worker with nodemon
npm run start:server:dev  # Server only
npm run start:worker:dev  # Worker only

# Tests
npm test  # Runs backend + parser tests
npm run test:e2e --workspace=apps/back  # E2E with testcontainers
```

### File Processing Flow
1. User uploads file → `DepotController` saves to S3
2. Server enqueues job to `QueueName.process_file` (pg-boss)
3. Worker picks up job → `FileProcessorService` dispatches control jobs
4. Runs `controle_sandre` and `controle_v1` in parallel; when both succeed, enqueues `send_to_sftp` (coordination in `DepotCoordinatorService`)
5. Worker processors execute the controls + SFTP export
6. Frontend polls depot status via API

See [apps/back/src/worker/fileProcessor](../apps/back/src/worker/fileProcessor) for processor implementations.

## Project Conventions

### Naming & Organization
- Entities: `*.entity.ts` (TypeORM classes)
- DTOs: `*.dto.ts` (exported from `packages/dossier`)
- Gateways: `*.gateway.ts` (interfaces as abstract classes or Symbol-based)
- Services: Business logic in `*.service.ts`
- Use cases: Explicit classes in `usecase/` directories (e.g., `DeposerUnFichier`)

### Environment Configuration
Critical env vars (see `apps/back/example.env`):
- `S3_PROVIDER`: `mock` (dev) or `outscale` (prod)
- `USE_SANDRE_MOCK`: `true` to bypass external SANDRE API
- `OIDC_MOCK`: `true` for local auth bypass
- `OIDC_FAKE_TOKEN`: shared token expected by the backend when `OIDC_MOCK=true`
- `EMAIL_PROVIDER`: `mock`, `mailcatcher`, or `brevo`

Always use mock providers in tests. Real providers require external services.

### Testing Patterns
- E2E tests use `@testcontainers/postgresql` (see [apps/back/test/testcontainer.config.ts](../apps/back/test/testcontainer.config))
- E2E tests mock `pg-boss` via `moduleNameMapper` in `apps/back/test/jest-e2e.json` (maps `pg-boss` to [apps/back/test/mocks/pg-boss.mock.ts](../apps/back/test/mocks/pg-boss.mock))
- Some unit tests also stub `pg-boss` with `jest.mock('pg-boss', ...)` when they don’t need real queue behavior
- E2E timeout: 60s (defined in `jest-e2e.json`)
- Shared test helpers in [apps/back/test/](../apps/back/test) (depot.helper.ts, createReferentielDataset.ts)

### Shared Package Pattern
`@lib/dossier` and `@lib/parser` are TypeScript project references:
- Must be built before backend/frontend: `npm run build` from package dir
- OR run watchers: `npm run dev --workspace=packages/dossier`
- Changes require rebuild/restart unless watchers are running

## External Integration Points

### SANDRE Service
XML validation service for wastewater monitoring standards:
- Real: External French government API
- Mock: `SandreMockService` (controlled by `USE_SANDRE_MOCK`)
- See [apps/back/src/dossier/controle/technique/sandre](../apps/back/src/dossier/controle/technique/sandre)

### Referentiels (Roseau/Lanceleau)
Read-only reference data from external systems:
- Roseau: Treatment plants, collectors, monitoring points
- Lanceleau: Parameters, units, analysis methods
- Loaded from external sources (not managed by this app)
- See [apps/back/src/referentiel](../apps/back/src/referentiel)

### SFTP Export
Validated files exported to external SFTP server:
- Provider toggle: `SFTP_PROVIDER=mock|real`
- Worker job: `QueueName.send_to_sftp`
- See [apps/back/src/infra/sftp](../apps/back/src/infra/sftp)

## Common Pitfalls
1. **Don't start backend without worker** - file processing will hang
2. **Build shared packages first** - `@lib/*` dependencies won't resolve otherwise
3. **Match module boundaries** - Never import across `apps/` directly, use `packages/` for sharing
4. **Use testcontainers for DB tests** - Don't assume local Postgres is running
5. **Frontend builds are served by backend** - Production uses `FrontendStaticModule`, not separate servers
