# Project: Verseau2

## Quick Context

Application de depots de fichiers et de tableaux de bord d'autosurveillance des eaux usees. Monorepo TypeScript: NestJS 11 backend (dual-process: HTTP server + async worker) + React 19 frontend (Vite, DSFR). PostgreSQL, pg-boss queues, S3 storage, SFTP/FTP export.

## Commands

```bash
pnpm test                            # Run every workspace test script
pnpm --filter back test:unit         # Backend unit tests
pnpm --filter back test:e2e          # Backend e2e tests (testcontainers)
pnpm --filter back test:e2e:api-worker # E2E tests with API + worker
pnpm --filter front check            # Frontend TypeScript check
pnpm --filter front test             # Frontend unit tests
pnpm --filter front test -- <file>   # Run a single frontend test file (e.g. SelectAutocomplete.spec.tsx)
pnpm build                           # Production build (front + back)
pnpm --filter back lint              # Lint backend
pnpm --filter front lint             # Lint frontend
```

## Memory System

This project uses a 2-layer memory structure in `.agent-memory/`.

### Layer 1: Static Identity (read mostly)

_Rarely changes. Defines the project DNA._

- `.agent-memory/project-brief.md` -- Goals, scope, stakeholders
- `.agent-memory/architecture.md` -- System design, dual-process backend, hexagonal architecture, data flow
- `.agent-memory/tech-context.md` -- Stack, dependencies, setup, path aliases, constraints
- `.agent-memory/conventions.md` -- Code style, naming, git, testing patterns

### Layer 2: Accumulated Experience (curated over time)

_Grows over time but should stay concise and reusable._

- `.agent-memory/lessons-learned.md` -- Reusable solutions, strategies, and pitfalls worth keeping

## Session Protocol

### Start of session

1. Load Layer 1 files if relevant

### End of session

2. Remember reusable insights in `lessons-learned.md`

## Critical Rules

- Use pnpm, not npm or yarn
- Run the relevant tests/checks before considering your task finished; if they cannot be run, state why
