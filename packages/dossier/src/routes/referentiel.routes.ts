import { z } from 'zod';
import type { RouteDefinition } from './route.types';

// GET /referentiel/codes-to-parametres - Convert numeric codes to parametre names
export const codesToParametres = {
  method: 'GET',
  path: '/referentiel/codes-to-parametres',
  query: z.object({
    codes: z.union([z.string(), z.array(z.string())]),
  }),
  response: z.object({
    parametres: z.array(z.string().nullable()),
  }),
} as const satisfies RouteDefinition;
