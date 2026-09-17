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
pnpm --filter front exec vitest run <file> # Run a single frontend test file
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

- `.agent-memory/lessons-learned.md` -- Compact macro-topic index; use it to select relevant lessons
- `.agent-memory/lessons/<topic>.md` -- One file per broad topic, with short sections per lesson; no topic subfolders

## Session Protocol

### Start of session

1. Load only the Layer 1 files relevant to the task.
2. Read the lesson index, then only the topic files needed for the task; skip lesson loading when nothing matches. Do not load the entire memory directory.

### End of session

1. Add reusable insights to the relevant `.agent-memory/lessons/<topic>.md`, reading it before editing. Prefer existing macro-topics and keep topic files directly in `lessons/`, without subfolders; keep each lesson section to 1–3 sentences and each topic file under roughly 100 lines.
2. Maintain links and one-line selection cues in `lessons-learned.md` when topics are added, renamed, removed, or change scope. Keep it an index, not a session log or a collection of full lessons.
3. Update affected Layer 1 references when verified code or configuration changes make them stale.

## Critical Rules

- Use pnpm, not npm or yarn
- Run the relevant tests/checks before considering your task finished; if they cannot be run, state why
