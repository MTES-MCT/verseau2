import { z } from 'zod';

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
});

export type IndicateurSteuDto = z.infer<typeof IndicateurSteuDtoSchema>;
