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

1. Read `active-context.md` and `todo.md`
2. Load Layer 1 files only if relevant to the current task

### During work

3. Update `todo.md` after completing each step
4. Write discoveries or decisions to `active-context.md`

### End of session

5. Update `progress.md` with what was accomplished
6. Move reusable insights from `active-context.md` to `lessons-learned.md`
7. Update `todo.md` with remaining/new tasks

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

### Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git commit` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Clean up** - Clear stashes, prune remote branches
5. **Verify** - All changes committed
6. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git commit` succeeds
- NEVER stop before commiting - that leaves work stranded locally
- NEVER say "ready to commit when you are" - YOU must commit
- If commit fails, resolve and retry until it succeeds

