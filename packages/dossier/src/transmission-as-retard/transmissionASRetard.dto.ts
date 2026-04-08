import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

export const TransmissionASRetardSteuDtoSchema = z.object({
  codeSandre: z.string(),
  nom: z.string().nullable(),
  trancheObligation: z.string().nullable(),
  capaciteNominale: z.number().nullable(),
  nbFichiersAsRecus: z.number().nullable(),
  dateDernierFichierRecu: z.string().nullable(),
  dateDebutPeriode: z.string().nullable(),
  dateFinPeriode: z.string().nullable(),
  dateMesureSuivanteAttendue: z.string().nullable(),
  nbJoursRetard: z.number().nullable(),
});

export type TransmissionASRetardSteuDto = z.infer<typeof TransmissionASRetardSteuDtoSchema>;

// SCL a exactement les mêmes colonnes affichées
export const TransmissionASRetardSclDtoSchema = z.object({
  codeSandre: z.string(),
  nom: z.string().nullable(),
  trancheObligation: z.string().nullable(),
  capaciteNominale: z.number().nullable(),
  nbFichiersAsRecus: z.number().nullable(),
  dateDernierFichierRecu: z.string().nullable(),
  dateDebutPeriode: z.string().nullable(),
  dateFinPeriode: z.string().nullable(),
  dateMesureSuivanteAttendue: z.string().nullable(),
  nbJoursRetard: z.number().nullable(),
});

export type TransmissionASRetardSclDto = z.infer<typeof TransmissionASRetardSclDtoSchema>;

export const PaginatedTransmissionASRetardSteuResponseSchema = createPaginatedResponseSchema(
  TransmissionASRetardSteuDtoSchema,
);
export type PaginatedTransmissionASRetardSteuResponse = z.infer<typeof PaginatedTransmissionASRetardSteuResponseSchema>;

export const PaginatedTransmissionASRetardSclResponseSchema = createPaginatedResponseSchema(
  TransmissionASRetardSclDtoSchema,
);
export type PaginatedTransmissionASRetardSclResponse = z.infer<typeof PaginatedTransmissionASRetardSclResponseSchema>;
