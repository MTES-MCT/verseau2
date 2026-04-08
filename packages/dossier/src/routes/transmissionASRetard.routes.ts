import { z } from 'zod';
import type { RouteDefinition } from '../routes/route.types';
import {
  TransmissionASRetardSteuDtoSchema,
  TransmissionASRetardSclDtoSchema,
  PaginatedTransmissionASRetardSteuResponseSchema,
  PaginatedTransmissionASRetardSclResponseSchema,
} from '../transmission-as-retard/transmissionASRetard.dto';
import { createPaginationQuerySchema } from '../shared/pagination.schema';

export const TransmissionASRetardSteuSortBy = z.enum([
  'nbJoursRetard',
  'codeSandre',
  'nom',
  'trancheObligation',
  'capaciteNominale',
  'dateDernierFichierRecu',
]);
export type TransmissionASRetardSteuSortByValue = z.infer<typeof TransmissionASRetardSteuSortBy>;

export const TransmissionASRetardSclSortBy = z.enum([
  'nbJoursRetard',
  'codeSandre',
  'nom',
  'trancheObligation',
  'capaciteNominale',
  'dateDernierFichierRecu',
]);
export type TransmissionASRetardSclSortByValue = z.infer<typeof TransmissionASRetardSclSortBy>;

export const CURRENT_TRANSMISSION_YEAR = new Date().getFullYear();
export const FIRST_TRANSMISSION_YEAR = CURRENT_TRANSMISSION_YEAR - 1;

const TransmissionYearSchema = z.coerce.number().int().min(FIRST_TRANSMISSION_YEAR).max(CURRENT_TRANSMISSION_YEAR);

export const listTransmissionASRetardSteu = {
  method: 'GET',
  path: '/suivi-regulier/transmission-as-retard/steu',
  query: z
    .object({
      year: TransmissionYearSchema,
      codeSandre: z.string().optional(),
    })
    .extend(createPaginationQuerySchema(TransmissionASRetardSteuSortBy).shape),
  response: PaginatedTransmissionASRetardSteuResponseSchema,
} as const satisfies RouteDefinition;

export const listTransmissionASRetardScl = {
  method: 'GET',
  path: '/suivi-regulier/transmission-as-retard/scl',
  query: z
    .object({
      year: TransmissionYearSchema,
      codeSandre: z.string().optional(),
    })
    .extend(createPaginationQuerySchema(TransmissionASRetardSclSortBy).shape),
  response: PaginatedTransmissionASRetardSclResponseSchema,
} as const satisfies RouteDefinition;
