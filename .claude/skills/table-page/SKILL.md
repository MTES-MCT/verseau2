---
name: table-page
description: Creates a full-stack paginated table page with filters, sorting, and detail view — from SQL to React — using MasaProvider.
---

# Table Page Skill

Full-stack paginated table page: DTO -> route -> repository -> gateway -> masa.provider -> service -> mapper -> controller -> API service -> hook -> filters hook -> table data helper -> page component.

Reference implementation: **conformite** feature (commit `d457346a`).

## File Creation Order

### 1. Shared Package (`packages/dossier/`)

| Step | File                                                | What to do                                                                        | Reference                          |
| ---- | --------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| 1    | `src/<domain>/<domain>.dto.ts`                      | Zod schemas for list item + detail + `createPaginatedResponseSchema`              | `src/conformite/conformite.dto.ts` |
| 2    | `src/routes/<domain>.routes.ts`                     | Route definitions: list (with `createPaginationQuerySchema(SortByEnum)`) + detail | `src/routes/conformite.routes.ts`  |
| 3    | `src/index.ts`                                      | Re-export both new files                                                          | —                                  |
| 4    | Build: `npm run build --workspace=packages/dossier` |                                                                                   |                                    |

### 2. Backend (`apps/back/`)

| Step | File                                          | What to do                                                                                                                  | Reference                                  |
| ---- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 5    | `src/masa/masa.dto.ts`                        | Internal `Filters` (extends `PaginationQuery`), `Row` (may extend shared DTO with extra fields), `DetailRow` types          | `src/masa/masa.dto.ts`                     |
| 6    | `src/referentiel/roseau/roseau.gateway.ts`    | Add `find<Domain>` + `find<Domain>Detail` method signatures                                                                 | `src/referentiel/roseau/roseau.gateway.ts` |
| 7    | `src/referentiel/roseau/roseau.repository.ts` | SQL implementation: parameterized queries, sort column mapping (camelCase->snake_case), WHERE clauses, COUNT + LIMIT/OFFSET | `findConformiteSteu`                       |
| 8    | `src/masa/masa.provider.ts`                   | Pass-through methods with `TODO: Remplacer par appel ... API MASA` comment                                                  | `src/masa/masa.provider.ts`                |
| 9    | `src/<domain>/<domain>.service.ts`            | Auth resolution (CDAs->CDNs), filter construction with conditional spread, delegate to masaProvider                         | `src/conformite/conformite.service.ts`     |
| 10   | `src/<domain>/<domain>.mapper.ts`             | Transform internal `Row` -> public `Dto` (strip internal-only fields)                                                       | `src/conformite/conformite.mapper.ts`      |
| 11   | `src/<domain>/<domain>.controller.ts`         | `@UseGuards(MeGuard, HasUserAccessToOuvragesGuard)`, `ZodValidationPipe`, `RouteResponse<typeof route>`                     | `src/conformite/conformite.controller.ts`  |
| 12   | `src/<domain>/<domain>.module.ts`             | Imports `MasaModule`, declares controller + service                                                                         | `src/conformite/conformite.module.ts`      |
| 13   | `src/api/api.module.ts`                       | Add new module to imports array                                                                                             | —                                          |

### 3. Frontend (`apps/front/`)

| Step | File                                       | What to do                                                                                                            | Reference                                      |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 14   | `src/api/<domain>.ts`                      | `apiCall(route, { query })` wrapper functions                                                                         | `src/api/conformite.ts`                        |
| 15   | `src/hooks/use<Domain>.ts`                 | TanStack Query hooks with `keepPreviousData` for list, standard for detail                                            | `src/hooks/useConformite.ts`                   |
| 16   | `src/hooks/use<Domain>Filters.ts`          | `FilterState`, query builder with conditional spread, pagination/sort state, reset page on filter change              | `src/hooks/useConformiteFilters.ts`            |
| 17   | `src/helper/<domain>TableData.tsx`         | `buildHeaders()` + `buildRows()` returning `ReactNode[][]`, use `Badge` for statuses, `formatDate` from `@lib/shared` | `src/helper/conformiteTableData.tsx`           |
| 18   | `src/pages/<domain>/<Domain>Dashboard.tsx` | DSFR `Table`, `Select`, `Pagination`, `Alert`; sortable headers; loading/error/empty states                           | `src/pages/conformite/ConformiteDashboard.tsx` |
| 19   | `src/routes.ts`                            | Add route constant                                                                                                    | —                                              |
| 20   | `src/App.tsx`                              | Add `<ProtectedRoute>` entry                                                                                          | —                                              |
| 21   | `src/components/Header.tsx`                | Add navigation entry                                                                                                  | —                                              |
| 22   | `src/components/Breadcrumb.tsx`            | Add breadcrumb segment + `currentPageLabel`                                                                           | —                                              |

### 4. Lint

```bash
npm run lint --workspace=apps/back && npm run lint --workspace=apps/front
```

## Key Patterns

- **Pagination**: `createPaginationQuerySchema(SortByEnum)` in routes, `PaginationQuery` in service options
- **Optional filters**: conditional spread `...(value ? { value } : {})` when building filter objects
- **Authorization**: retrieve authorizedSteuCdas and authorizedSclCdas from HasUserAccessToOuvragesGuard and optionally resolve user CDAs to internal CDNs via `masaProvider.findSteuBatchBySandreCdas()` before querying
- **Sorting**: `z.enum` for sortable columns in routes, camelCase->snake_case map in repository
- **MasaProvider**: pure pass-through, no business logic (see `masa-provider` skill)
- **Table rendering**: `Badge` from DSFR for statuses, `formatDate` from `@lib/shared` for dates
- **Detail modals**: DSFR `createModal()` pattern (see `ConformiteDetailModal`)

## Related Skills

- **`fullstack-route`** — Typed API stack (route definition -> controller -> API service -> Query hook). Covers steps 2, 11, 14, 15 in detail.
- **`masa-provider`** — MasaProvider facade pattern. Covers steps 5–8 (gateway, repository, provider, DTOs).
- **`nestjs-testing`** — Unit and e2e tests for NestJS services and controllers. Use after steps 9–12 to test the backend.
- **`dsfr-component`** — DSFR-compliant React components. Use for steps 17–18 (table data helpers, page component).

## Anti-Patterns

- No hardcoded API paths — always use route definitions from `@lib/dossier`
- No business logic in MasaProvider or controller — put it in the service
- No `apiCall` directly in components — wrap in hooks
- No duplicated Zod schemas — share via packages layer
- No direct gateway/repository injection in domain services — use MasaProvider
