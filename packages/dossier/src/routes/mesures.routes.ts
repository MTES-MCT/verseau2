import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { PaginatedMesuresResponseSchema } from '../mesure/mesure.dto';
import { createPaginationQuerySchema } from '../shared/pagination.schema';

/** Allow-list of sortable columns for the mesures list endpoint. */
export const MesuresSortBy = z.enum(['date', 'parametreCode', 'valeur', 'statut']);
export type MesuresSortByValue = z.infer<typeof MesuresSortBy>;

/** Type d'ouvrage : station d'épuration (STEU) ou système de collecte (SCL). */
export const OuvrageType = z.enum(['steu', 'scl']);
export type OuvrageTypeValue = z.infer<typeof OuvrageType>;

export const listMesures = {
  method: 'GET',
  path: '/mesures',
  query: z
    .object({
      ouvrageType: OuvrageType.default('steu'),
      steuSandreCdas: z.union([z.array(z.string()), z.string().transform((v) => [v])]).optional(),
      sclSandreCdas: z.union([z.array(z.string()), z.string().transform((v) => [v])]).optional(),
      pmoCdn: z.coerce.number().optional(),
      dateDebut: z.string().optional(),
      dateFin: z.string().optional(),
      parametreCode: z.string().optional(),
      qualification: z.string().optional(),
      finalite: z.string().optional(),
    })
    .extend(createPaginationQuerySchema(MesuresSortBy).shape),
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

export const listSystemesCollecte = {
  method: 'GET',
  path: '/mesures/systemes-collecte',
  response: z.array(
    z.object({
      sclSandreCda: z.string(),
      sclNom: z.string().nullable(),
    }),
  ),
} as const satisfies RouteDefinition;

export const listPointsMesure = {
  method: 'GET',
  path: '/mesures/points-mesure',
  query: z.object({
    ouvrageType: OuvrageType.default('steu'),
    ouvrageCode: z.string(),
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
    ouvrageType: OuvrageType.default('steu'),
    ouvrageCode: z.string(),
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
