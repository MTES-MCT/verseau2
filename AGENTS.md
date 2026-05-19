# Project: Verseau2

## Quick Context

Application de depots de fichiers et de tableaux de bord d'autosurveillance des eaux usees. Monorepo TypeScript: NestJS 11 backend (dual-process: HTTP server + async worker) + React 19 frontend (Vite, DSFR). PostgreSQL, pg-boss queues, S3 storage, SFTP export.

## Commands

```bash
pnpm test                            # Run backend unit + e2e tests and parser tests
pnpm --filter back test:e2e          # E2E tests (testcontainers)
pnpm --filter back test:e2e:api-worker # E2E tests with API + worker
pnpm build                           # Production build (front + back)
pnpm --filter back lint              # Lint backend
pnpm --filter front lint             # Lint frontend
pnpm --filter front test -- <file>   # Run a single frontend test file (e.g. SelectAutocomplete.spec.tsx)
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

- Always use path aliases (`@dossier/*`, `@infra/*`, etc.), never relative imports across module boundaries
- Never Commit on your own
- Scopes: `back`, `front`, or omit for root-level changes
- Most API controllers must use `@UseGuards` (architecture tests exempt `AuthenticationController`, `ReferentielController`, `VersionController`, and a few named endpoints)
- Gateway pattern: interface + Symbol export with same name
- Run tests before considering your task finished
- Use pnpm, not npm or yarn
- Mock providers exist for S3, SANDRE, Auth, Email, SFTP -- toggled via env vars
- Shared packages (`packages/*`) must be built before backend/frontend can use them

## Issue Tracking

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
```
