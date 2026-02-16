import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { IndicateurSteuDtoSchema } from '../indicateur/indicateur.dto';

// GET /indicateurs/steu - List STEU indicators for current user
export const getIndicateursSteu = {
  method: 'GET',
  path: '/indicateurs/steu',
  response: z.array(IndicateurSteuDtoSchema),
} as const satisfies RouteDefinition;
