import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import {
  ConformiteSclDetailDtoSchema,
  ConformiteSteuDetailDtoSchema,
  PaginatedConformiteSclResponseSchema,
  PaginatedConformiteSteuResponseSchema,
} from '../conformite/conformite.dto';
import { createPaginationQuerySchema } from '../shared/pagination.schema';

export const ConformiteSteuSortBy = z.enum([
  'ouvrageDepollutionCode',
  'ouvrageDepollutionNom',
  'trancheObligationLibelle',
  'capaciteNominaleEH',
  'conformiteNationaleProvisoire',
  'conformiteLocaleProvisoire',
]);
export type ConformiteSteuSortByValue = z.infer<typeof ConformiteSteuSortBy>;

export const ConformiteSclSortBy = z.enum([
  'systemeCollecteCode',
  'systemeCollecteNom',
  'trancheObligationLibelle',
  'typeScl',
  'conformiteLocaleTempsPluieProvisoire',
  'conformiteNationaleTempsPluieProvisoire',
]);
export type ConformiteSclSortByValue = z.infer<typeof ConformiteSclSortBy>;

export const listConformiteSteu = {
  method: 'GET',
  path: '/conformite/steu',
  query: z
    .object({
      trancheObligationLibelle: z.string().optional(),
      impact: z.enum(['avec', 'sans']).optional(),
    })
    .extend(createPaginationQuerySchema(ConformiteSteuSortBy).shape),
  response: PaginatedConformiteSteuResponseSchema,
} as const satisfies RouteDefinition;

export const listConformiteScl = {
  method: 'GET',
  path: '/conformite/scl',
  query: z
    .object({
      trancheObligationLibelle: z.string().optional(),
      impact: z.enum(['avec', 'sans']).optional(),
    })
    .extend(createPaginationQuerySchema(ConformiteSclSortBy).shape),
  response: PaginatedConformiteSclResponseSchema,
} as const satisfies RouteDefinition;

export const getConformiteSteuDetail = {
  method: 'GET',
  path: '/conformite/steu/:steuCdn/detail',
  params: z.object({
    steuCdn: z.coerce.number(),
  }),
  response: ConformiteSteuDetailDtoSchema.nullable(),
} as const satisfies RouteDefinition;

export const getConformiteSclDetail = {
  method: 'GET',
  path: '/conformite/scl/:sclCdn/detail',
  params: z.object({
    sclCdn: z.coerce.number(),
  }),
  response: ConformiteSclDetailDtoSchema.nullable(),
} as const satisfies RouteDefinition;
