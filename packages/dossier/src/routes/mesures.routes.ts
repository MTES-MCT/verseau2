import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { PaginatedMesuresResponseSchema } from '../mesure/mesure.dto';

export const listMesures = {
  method: 'GET',
  path: '/mesures',
  query: z.object({
    steuSandreCdas: z.union([z.array(z.string()), z.string().transform((v) => [v])]).optional(),
    dateDebut: z.string().optional(),
    dateFin: z.string().optional(),
    parametreCode: z.string().optional(),
    qualification: z.string().optional(),
    finalite: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['ASC', 'DESC']).optional(),
  }),
  response: PaginatedMesuresResponseSchema,
} as const satisfies RouteDefinition;

export const listOuvrages = {
  method: 'GET',
  path: '/mesures/ouvrages',
  response: z.array(
    z.object({
      steuSandreCda: z.string(),
      steuNom: z.string().nullable(),
    }),
  ),
} as const satisfies RouteDefinition;

export const listPointsMesure = {
  method: 'GET',
  path: '/mesures/points-mesure',
  query: z.object({
    steuSandreCda: z.string(),
  }),
  response: z.array(
    z.object({
      pmoNo: z.string(),
      pmoLb: z.string().nullable(),
    }),
  ),
} as const satisfies RouteDefinition;

export const listParametresMesure = {
  method: 'GET',
  path: '/mesures/parametres',
  query: z.object({
    steuSandreCda: z.string(),
    pmoNo: z.string(),
  }),
  response: z.array(
    z.object({
      parRfa: z.string(),
      parCourtNomLb: z.string().nullable(),
    }),
  ),
} as const satisfies RouteDefinition;
