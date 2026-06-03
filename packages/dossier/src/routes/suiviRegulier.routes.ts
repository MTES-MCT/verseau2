import { z } from 'zod';
import type { RouteDefinition } from '../routes/route.types';
import {
  EvenementSclDtoSchema,
  EvenementSteuDtoSchema,
  PaginatedEvenementSclResponseSchema,
  PaginatedEvenementSteuResponseSchema,
} from '../suivi-regulier/evenement.dto';
import { createPaginationQuerySchema } from '../shared/pagination.schema';

export const EvenementSteuSortBy = z.enum(['date', 'typeEvenementCode', 'prisEnCompte', 'finalite']);
export type EvenementSteuSortByValue = z.infer<typeof EvenementSteuSortBy>;

export const EvenementSclSortBy = z.enum([
  'date',
  'typeEvenementCode',
  'prisEnCompte',
  'finalite',
  'pointMesureNumero',
]);
export type EvenementSclSortByValue = z.infer<typeof EvenementSclSortBy>;

export const CURRENT_EVENEMENT_YEAR = new Date().getFullYear();
export const FIRST_EVENEMENT_YEAR = CURRENT_EVENEMENT_YEAR - 1;

const EvenementYearSchema = z.coerce.number().int().min(FIRST_EVENEMENT_YEAR).max(CURRENT_EVENEMENT_YEAR);

export const listEvenementSteu = {
  method: 'GET',
  path: '/suivi-regulier/evenement/steu',
  query: z
    .object({
      year: EvenementYearSchema,
      typeEvenementCode: z.string().optional(),
      ouvrageDepollutionCode: z.string().optional(),
    })
    .extend(createPaginationQuerySchema(EvenementSteuSortBy).shape),
  response: PaginatedEvenementSteuResponseSchema,
} as const satisfies RouteDefinition;

export const exportEvenementSteu = {
  method: 'GET',
  path: '/suivi-regulier/evenement/steu/export',
  query: listEvenementSteu.query,
} as const satisfies RouteDefinition;

export const listEvenementScl = {
  method: 'GET',
  path: '/suivi-regulier/evenement/scl',
  query: z
    .object({
      year: EvenementYearSchema,
      typeEvenementCode: z.string().optional(),
      pointMesureId: z.coerce.number().optional(),
      systemeCollecteCode: z.string().optional(),
    })
    .extend(createPaginationQuerySchema(EvenementSclSortBy).shape),
  response: PaginatedEvenementSclResponseSchema,
} as const satisfies RouteDefinition;

export const exportEvenementScl = {
  method: 'GET',
  path: '/suivi-regulier/evenement/scl/export',
  query: listEvenementScl.query,
} as const satisfies RouteDefinition;

export const listEvenementTypes = {
  method: 'GET',
  path: '/suivi-regulier/evenement/types',
  query: z.object({}),
  response: z.array(
    z.object({
      elementNomenclatureCode: z.string(),
      elementNomenclatureLibelle: z.string().nullable(),
    }),
  ),
} as const satisfies RouteDefinition;

export const listEvenementPmo = {
  method: 'GET',
  path: '/suivi-regulier/evenement/pmo',
  query: z.object({}),
  response: z.array(
    z.object({
      pointMesureId: z.number(),
      pointMesureNumero: z.string(),
      pointMesureLibelle: z.string().nullable(),
    }),
  ),
} as const satisfies RouteDefinition;
