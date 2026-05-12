import { z } from 'zod';

export const SteuDetailDtoSchema = z.object({
  ouvrageDepollutionCode: z.string(),
  dateMiseEnService: z.string().nullable(),
  exploitantNom: z.string().nullable(),
  moaNom: z.string().nullable(),
  exploitantSiret: z.string().nullable(),
  moaSiret: z.string().nullable(),
});

export type SteuDetailDto = z.infer<typeof SteuDetailDtoSchema>;

export const SclDetailDtoSchema = z.object({
  systemeCollecteCode: z.string(),
  exploitantNom: z.string().nullable(),
  moaNom: z.string().nullable(),
  exploitantSiret: z.string().nullable(),
  moaSiret: z.string().nullable(),
});

export type SclDetailDto = z.infer<typeof SclDetailDtoSchema>;