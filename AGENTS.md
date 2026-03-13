# Project: Verseau2

## Quick Context

Application de depots de fichiers d'autosurveillance des eaux usees. Monorepo TypeScript: NestJS 11 backend (dual-process: HTTP server + async worker) + React 19 frontend (Vite, DSFR). PostgreSQL, pg-boss queues, S3 storage, SFTP export.

## Commands

```bash
npm test              # Run backend + parser unit tests
npm run test:e2e --workspace=apps/back     # E2E tests (testcontainers)
npm run build         # Production build (front + back)
npm run lint --workspace=apps/back         # Lint backend
npm run lint --workspace=apps/front        # Lint frontend
npm run test --workspace=apps/front -- <file>  # Run a single frontend test file (e.g. SelectAutocomplete.spec.tsx)
```

## Memory System

This project uses a 2-layer memory structure in `.agent-memory/`.

### Layer 1: Static Identity (read mostly)

_Rarely changes. Defines the project DNA._

- `.agent-memory/project-brief.md` -- Goals, scope, stakeholders
- `.agent-memory/architecture.md` -- System design, dual-process backend, hexagonal architecture, data flow
- `.agent-memory/tech-context.md` -- Stack, dependencies, setup, path aliases, constraints
- `.agent-memory/conventions.md` -- Code style, naming, git, testing patterns

### Layer 2: Accumulated Experience (append-only)

_Grows over time. Capture insights._

- `.agent-memory/lessons-learned.md` -- Solutions to tricky problems, strategies that worked

## Session Protocol

### Start of session

1. Load Layer 1 files if relevant

### End of session

2. Remember reusable insights in `lessons-learned.md`

## Critical Rules

- Always use path aliases (`@dossier/*`, `@infra/*`, etc.), never relative imports across module boundaries
- Never Commit on your own
- Scopes: `back`, `front`, or omit for root-level changes
- All controllers must use `@UseGuards` (enforced by architecture tests)
- Gateway pattern: interface + Symbol export with same name
- Run tests before considering your task finished
- Use npm, not yarn or pnpm
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
