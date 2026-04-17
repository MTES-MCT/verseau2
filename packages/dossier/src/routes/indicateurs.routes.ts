import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { PaginatedIndicateurSteuResponseSchema } from '../indicateur/indicateur.dto';
import { createPaginationQuerySchema } from '../shared/pagination.schema';

// GET /indicateurs/steu - List STEU indicators for current user
export const getIndicateursSteu = {
  method: 'GET',
  path: '/indicateurs/steu',
  query: createPaginationQuerySchema()
    .omit({ sortBy: true, sortOrder: true })
    .extend({
      pageSize: z.coerce.number().int().min(1).max(100).default(50),
    }),
  response: PaginatedIndicateurSteuResponseSchema,
} as const satisfies RouteDefinition;
