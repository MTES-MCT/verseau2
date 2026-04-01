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
  'conformiteLocaleProvisoire',
]);
export type ConformiteSteuSortByValue = z.infer<typeof ConformiteSteuSortBy>;

export const ConformiteSclSortBy = z.enum([
  'systemeCollecteCode',
  'systemeCollecteNom',
  'trancheObligationLibelle',
  'typeScl',
  'conformiteLocaleTempsPluieProvisoire',
]);
export type ConformiteSclSortByValue = z.infer<typeof ConformiteSclSortBy>;

export const CURRENT_CONFORMITE_YEAR = new Date().getFullYear();
export const FIRST_CONFORMITE_YEAR = CURRENT_CONFORMITE_YEAR - 1;

export function getCurrentConformiteYear() {
  return new Date().getFullYear();
}

const ConformiteYearValueSchema = z.coerce
  .number()
  .int()
  .min(FIRST_CONFORMITE_YEAR)
  .superRefine((year, ctx) => {
    const currentYear = getCurrentConformiteYear();
    if (year > currentYear) {
      ctx.addIssue({
        code: 'too_big',
        maximum: currentYear,
        origin: 'number',
        inclusive: true,
        message: `Number must be less than or equal to ${currentYear}`,
      });
    }
  });

const ConformiteYearQuerySchema = z.object({
  year: ConformiteYearValueSchema,
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
