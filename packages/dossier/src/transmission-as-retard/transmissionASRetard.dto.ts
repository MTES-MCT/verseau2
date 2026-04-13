import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

export const TransmissionASRetardSteuDtoSchema = z.object({
  ouvrageDepollutionCode: z.string(),
  ouvrageDepollutionNom: z.string().nullable(),
  trancheObligationLibelle: z.string().nullable(),
  capaciteNominaleEH: z.number().nullable(),
  nbFichiersAsRecus: z.number().nullable(),
  dateDernierFichierRecu: z.string().nullable(),
  dateDebutPeriode: z.string().nullable(),
  dateFinPeriode: z.string().nullable(),
  dateMesureSuivanteAttendue: z.string().nullable(),
  nbJoursRetard: z.number().nullable(),
});

export type TransmissionASRetardSteuDto = z.infer<typeof TransmissionASRetardSteuDtoSchema>;

export const TransmissionASRetardSclDtoSchema = z.object({
  systemeCollecteCode: z.string(),
  systemeCollecteNom: z.string().nullable(),
  trancheObligationLibelle: z.string().nullable(),
  capaciteNominaleEH: z.number().nullable(),
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
