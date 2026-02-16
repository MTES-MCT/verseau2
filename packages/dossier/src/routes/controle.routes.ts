import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { ControleDtoSchema, ControleSandreDtoSchema } from '../controle/controle.dto';
import { MasaDtoSchema } from '../masa/masa.dto';

// GET /depot/:depotId/controle - List controles for a depot
export const getControles = {
  method: 'GET',
  path: '/depot/:depotId/controle',
  params: z.object({ depotId: z.string() }),
  response: z.array(ControleDtoSchema),
} as const satisfies RouteDefinition;

// GET /depot/:depotId/controle/sandre - List Sandre controles for a depot
export const getControlesSandre = {
  method: 'GET',
  path: '/depot/:depotId/controle/sandre',
  params: z.object({ depotId: z.string() }),
  response: z.array(ControleSandreDtoSchema),
} as const satisfies RouteDefinition;

// GET /depot/:depotId/masa - Get MASA integration status for a depot
export const getMasa = {
  method: 'GET',
  path: '/depot/:depotId/masa',
  params: z.object({ depotId: z.string() }),
  response: MasaDtoSchema.nullable(),
} as const satisfies RouteDefinition;
