import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { PaginatedMesuresResponseSchema } from '../mesure/mesure.dto';
import { PaginationQuerySchema } from '../shared/pagination.schema';

export const listMesures = {
  method: 'GET',
  path: '/mesures',
  query: z
    .object({
      steuSandreCdas: z.union([z.array(z.string()), z.string().transform((v) => [v])]).optional(),
      pmoCdn: z.coerce.number().optional(),
      dateDebut: z.string().optional(),
      dateFin: z.string().optional(),
      parametreCode: z.string().optional(),
      qualification: z.string().optional(),
      finalite: z.string().optional(),
    })
    .extend(PaginationQuerySchema.shape),
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
      pmoCdn: z.number(),
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
    pmoCdn: z.coerce.number(),
  }),
  response: z.array(
    z.object({
      parRfa: z.string(),
      parCourtNomLb: z.string().nullable(),
    }),
  ),
} as const satisfies RouteDefinition;

export const listFinalites = {
  method: 'GET',
  path: '/mesures/finalites',
  response: z.array(
    z.object({
      code: z.string(),
      label: z.string().nullable(),
    }),
  ),
} as const satisfies RouteDefinition;
