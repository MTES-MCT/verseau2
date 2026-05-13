import { z } from 'zod';

export const IntervenantDetailDtoSchema = z.object({
  intervenantNom: z.string().nullable(),
  intervenantSiret: z.string().nullable(),
});

export type IntervenantDetailDto = z.infer<typeof IntervenantDetailDtoSchema>;

export const SteuDetailDtoSchema = z.object({
  ouvrageDepollutionCode: z.string(),
  dateMiseEnService: z.string().nullable(),
  exploitants: z.array(IntervenantDetailDtoSchema),
  maitresOuvrage: z.array(IntervenantDetailDtoSchema),
});

export type SteuDetailDto = z.infer<typeof SteuDetailDtoSchema>;

export const SclDetailDtoSchema = z.object({
  systemeCollecteCode: z.string(),
  exploitants: z.array(IntervenantDetailDtoSchema),
  maitresOuvrage: z.array(IntervenantDetailDtoSchema),
});

export type SclDetailDto = z.infer<typeof SclDetailDtoSchema>;
