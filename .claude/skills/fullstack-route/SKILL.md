---
name: fullstack-route
description: Creates a typed API endpoint across shared route definition, NestJS controller, frontend service, and Query hook.
---

# Fetch API Data Skill

Full typed API stack: route definition -> controller -> API service -> Query hook.

## Flow

```
packages/dossier/src/routes/<domain>.routes.ts   -- Shared contract
apps/back/src/<domain>/<entity>.controller.ts     -- NestJS (uses route types)
apps/front/src/api/<domain>.ts                    -- API service (apiCall)
apps/front/src/hooks/use<Feature>.ts              -- TanStack Query hook
```

## 1. Route Definition

File: `packages/dossier/src/routes/<domain>.routes.ts`. Re-export from `packages/dossier/src/index.ts`. Rebuild: `npm run build --workspace=packages/dossier`.

```typescript
import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { MyDtoSchema } from '../myDomain/my.dto';

export const listItems = {
  method: 'GET',
  path: '/my-domain',
  response: z.array(MyDtoSchema),
} as const satisfies RouteDefinition;

export const getItem = {
  method: 'GET',
  path: '/my-domain/:id',
  params: z.object({ id: z.string() }),
  response: MyDtoSchema,
} as const satisfies RouteDefinition;

export const createItem = {
  method: 'POST',
  path: '/my-domain',
  body: z.object({ name: z.string() }),
  response: MyDtoSchema,
} as const satisfies RouteDefinition;
```

## 2. NestJS Controller

- Return type: `RouteResponse<typeof route>` (never duplicate types)
- Validation: `@Query(new ZodValidationPipe(route['query']))` or `@Body(new ZodValidationPipe(route['body']))`
- All controllers MUST use `@UseGuards(...)`

```typescript
import type { RouteQuery, RouteResponse, RouteBody } from '@lib/dossier';
import { listItems, createItem } from '@lib/dossier';
import { ZodValidationPipe } from '@shared/schema/zodValidation.pipe';

@Controller('my-domain')
export class MyDomainController {
  @Get()
  async list(): Promise<RouteResponse<typeof listItems>> {
    return this.myService.findAll();
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createItem['body'])) body: RouteBody<typeof createItem>,
  ): Promise<RouteResponse<typeof createItem>> {
    return this.myService.create(body);
  }
}
```

## 3. Frontend API Service

File: `apps/front/src/api/<domain>.ts`. Import from `./apiClient`.

- `apiCall(route, { params?, query?, body? })` -- typed JSON calls (response inferred)
- `buildRoutePath(route, { params }) + apiDownload()` -- binary downloads
- `apiPostFormData()` -- file uploads
- Never hardcode paths; always use route definitions

```typescript
import { listItems, getItem, downloadRapport } from '@lib/dossier';
import { apiCall, buildRoutePath, apiDownload } from './apiClient';

export const fetchItems = () => apiCall(listItems);
export const fetchItem = (id: string) => apiCall(getItem, { params: { id } });
export const downloadReport = (id: string) => apiDownload(buildRoutePath(downloadRapport, { params: { id } }));
```

## 4. TanStack Query Hook

File: `apps/front/src/hooks/use<Feature>.ts`. Wraps API service functions -- never call `apiCall` directly.

```typescript
// Query
import { useQuery } from '@tanstack/react-query';
import { fetchItems } from '../api/myDomain';

export function useItems() {
  return useQuery({ queryKey: ['items'], queryFn: fetchItems });
}

// Mutation
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createItem } from '../api/myDomain';

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['items'] }),
  });
}
```

For binary downloads, use `useState` instead of TanStack Query (see `useRapportAndXmlDownload.ts` for pattern).

## Checklist

1. Define route in `packages/dossier/src/routes/` + re-export from `index.ts`
2. Build shared package: `npm run build --workspace=packages/dossier`
3. Implement controller with route types
4. Create API service function in `apps/front/src/api/`
5. Create hook in `apps/front/src/hooks/`
6. Lint: `npm run lint --workspace=apps/back && npm run lint --workspace=apps/front`

## Anti-Patterns

- No hardcoded API paths -- use route definitions
- No `apiGet<ManualType>('/path')` for new code -- use `apiCall(route)`
- No duplicated Zod schemas -- share via `@lib/dossier`
- No `apiCall` directly in components -- wrap in hook or service
