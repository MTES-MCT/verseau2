import { z } from 'zod';
import type { RouteDefinition } from './route.types';
import { 
  PaginatedConformiteSteuResponseSchema, 
  PaginatedConformiteSclResponseSchema,
  ConformiteSteuDetailDtoSchema,
  ConformiteSclDetailDtoSchema 
} from '../conformite/conformite.dto';
import { createPaginationQuerySchema } from '../shared/pagination.schema';

/** Allow-list of sortable columns for the STEU conformite list endpoint. */
export const ConformiteSteuSortBy = z.enum([
  'ouvrageDepollutionCode', 
  'ouvrageDepollutionNom', 
  'trancheObligationLibelle', 
  'capaciteNominaleEH', 
  'conformiteNationaleProvisoire', 
  'conformiteLocaleProvisoire'
]);
export type ConformiteSteuSortByValue = z.infer<typeof ConformiteSteuSortBy>;

/** Allow-list of sortable columns for the SCL conformite list endpoint. */
export const ConformiteSclSortBy = z.enum([
  'systemeCollecteCode', 
  'systemeCollecteNom', 
  'trancheObligationLibelle', 
  'typeScl', 
  'conformiteLocaleTempsPluieProvisoire', 
  'conformiteNationaleTempsPluieProvisoire'
]);
export type ConformiteSclSortByValue = z.infer<typeof ConformiteSclSortBy>;

export const listConformiteSteu = {
  method: 'GET',
  path: '/conformite/steu',
  query: z
    .object({ 
      trancheObligationLibelle: z.string().optional(), 
      impact: z.enum(['avec', 'sans']).optional() 
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
      impact: z.enum(['avec', 'sans']).optional() 
    })
    .extend(createPaginationQuerySchema(ConformiteSclSortBy).shape),
  response: PaginatedConformiteSclResponseSchema,
} as const satisfies RouteDefinition;

export const getConformiteSteuDetail = {
  method: 'GET',
  path: '/conformite/steu/:steuCdn/detail',
  params: z.object({ steuCdn: z.coerce.number() }),
  response: ConformiteSteuDetailDtoSchema,
} as const satisfies RouteDefinition;

export const getConformiteSclDetail = {
  method: 'GET',
  path: '/conformite/scl/:sclCdn/detail',
  params: z.object({ sclCdn: z.coerce.number() }),
  response: ConformiteSclDetailDtoSchema,
} as const satisfies RouteDefinition;
