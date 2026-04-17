import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

export const IndicateurSteuDtoSchema = z.object({
  bassin: z.string(),
  region: z.string(),
  departement: z.string(),
  codeSandreAgglo: z.string(),
  nomAgglo: z.string(),
  nature: z.string(),
  trancheObligation: z.string(),
  etatAgglo: z.string(),
  tailleAggloEhAnN: z.number(),
  sommeChargesMaxEntrantesEh: z.number(),
  codeSandreSteu: z.string(),
  nomSteu: z.string(),
  capaciteNominaleEhAnN: z.number(),
  debitReference: z.number(),
  chargeEntranteEhAnN: z.number(),
  pc95Retenu: z.number().nullable(),
  nbAnneesMaxPc95: z.number(),
  annee: z.number(),
  // Conformité SCL (sclconf) — temps de pluie
  codeSandreScl: z.string().nullable(),
  dateValidationConformite: z.string().nullable(),
  volumeDeverse5ansPc: z.number().nullable(),
  fluxDeverse5ansPc: z.number().nullable(),
  joursDeversement5ansMoy: z.number().nullable(),
});

export type IndicateurSteuDto = z.infer<typeof IndicateurSteuDtoSchema>;

export const PaginatedIndicateurSteuResponseSchema = createPaginatedResponseSchema(IndicateurSteuDtoSchema);

export type PaginatedIndicateurSteuResponse = z.infer<typeof PaginatedIndicateurSteuResponseSchema>;
