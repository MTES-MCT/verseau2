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

export const FIRST_CONFORMITE_YEAR = 2006;
export const CURRENT_CONFORMITE_YEAR = new Date().getFullYear();

const ConformiteYearQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(FIRST_CONFORMITE_YEAR)
    .max(CURRENT_CONFORMITE_YEAR)
    .default(CURRENT_CONFORMITE_YEAR),
});

export const listConformiteSteu = {
  method: 'GET',
  path: '/conformite/steu',
  query: z
    .object({
      year: ConformiteYearQuerySchema.shape.year,
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
      year: ConformiteYearQuerySchema.shape.year,
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
  query: ConformiteYearQuerySchema,
  response: ConformiteSteuDetailDtoSchema.nullable(),
} as const satisfies RouteDefinition;

export const getConformiteSclDetail = {
  method: 'GET',
  path: '/conformite/scl/:sclCdn/detail',
  params: z.object({
    sclCdn: z.coerce.number(),
  }),
  query: ConformiteYearQuerySchema,
  response: ConformiteSclDetailDtoSchema.nullable(),
} as const satisfies RouteDefinition;
