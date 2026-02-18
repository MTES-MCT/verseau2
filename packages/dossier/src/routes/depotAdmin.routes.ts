import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { DepotDtoSchema } from '../depot/depot.dto';

// GET /admin/depot - List all depots (admin)
export const listAllDepots = {
  method: 'GET',
  path: '/admin/depot',
  response: z.array(DepotDtoSchema),
} as const satisfies RouteDefinition;

// GET /admin/depot/:id/rapport - Download rapport (admin, binary)
export const downloadAdminRapport = {
  method: 'GET',
  path: '/admin/depot/:id/rapport',
  params: z.object({ id: z.string() }),
} as const satisfies RouteDefinition;

export const downloadAdminXml = {
  method: 'GET',
  path: '/admin/depot/:id/xml',
  params: z.object({
    id: z.string(),
  }),
} as const satisfies RouteDefinition;
