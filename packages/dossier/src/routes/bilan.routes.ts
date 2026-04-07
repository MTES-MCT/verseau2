import { z } from 'zod';
import type { RouteDefinition } from '../routes/route.types';
import {
  BilanSclDtoSchema,
  BilanSteuDtoSchema,
  PaginatedBilanSclResponseSchema,
  PaginatedBilanSteuResponseSchema,
} from '../bilan/bilan.dto';
import { createPaginationQuerySchema } from '../shared/pagination.schema';

export const BilanSteuSortBy = z.enum(['date', 'ouvrageDepollutionCode', 'ouvrageDepollutionNom', 'parametreNom']);
export type BilanSteuSortByValue = z.infer<typeof BilanSteuSortBy>;

export const BilanSclSortBy = z.enum(['date', 'systemeCollecteCode', 'pointMesureNumero', 'statut']);
export type BilanSclSortByValue = z.infer<typeof BilanSclSortBy>;

export const CURRENT_BILAN_YEAR = new Date().getFullYear();
export const FIRST_BILAN_YEAR = CURRENT_BILAN_YEAR - 1;

const BilanYearSchema = z.coerce.number().int().min(FIRST_BILAN_YEAR).max(CURRENT_BILAN_YEAR);

export const listBilanSteu = {
  method: 'GET',
  path: '/suivi-regulier/bilan/steu',
  query: z
    .object({
      year: BilanYearSchema,
      ouvrageDepollutionCode: z.string().optional(),
    })
    .extend(createPaginationQuerySchema(BilanSteuSortBy).shape),
  response: PaginatedBilanSteuResponseSchema,
} as const satisfies RouteDefinition;

export const listBilanScl = {
  method: 'GET',
  path: '/suivi-regulier/bilan/scl',
  query: z
    .object({
      year: BilanYearSchema,
      systemeCollecteCode: z.string().optional(),
      pointMesureIdentifiant: z.coerce.number().optional(),
      statut: z.enum(['TP', 'TS']).optional(),
    })
    .extend(createPaginationQuerySchema(BilanSclSortBy).shape),
  response: PaginatedBilanSclResponseSchema,
} as const satisfies RouteDefinition;
