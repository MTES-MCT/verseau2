import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

export const BilanSteuDtoSchema = z.object({
  steuCdn: z.number(),
  ouvrageDepollutionCode: z.string(),
  bilanEcarteParSpe: z.boolean(),
  date: z.string(),
  parametreNom: z.string().nullable(),
  hcnf: z.enum(['Oui', 'Non']).nullable(),
  evt: z.enum(['Oui', 'Non']).nullable(),
  finalite: z.string().nullable(),
});

export type BilanSteuDto = z.infer<typeof BilanSteuDtoSchema>;

export const BilanSclDtoSchema = z.object({
  sclCdn: z.number(),
  systemeCollecteCode: z.string(),
  systemeCollecteNom: z.string().nullable(),
  pointMesureId: z.number(),
  pointMesureNumero: z.string(),
  pointMesureLibelle: z.string().nullable(),
  date: z.string(),
  volumeDeverse: z.number().nullable(),
  tempsDeversement: z.number().nullable(),
  statut: z.enum(['TP', 'TS']),
});

export type BilanSclDto = z.infer<typeof BilanSclDtoSchema>;

export const PaginatedBilanSteuResponseSchema = createPaginatedResponseSchema(BilanSteuDtoSchema);
export type PaginatedBilanSteuResponse = z.infer<typeof PaginatedBilanSteuResponseSchema>;

export const PaginatedBilanSclResponseSchema = createPaginatedResponseSchema(BilanSclDtoSchema);
export type PaginatedBilanSclResponse = z.infer<typeof PaginatedBilanSclResponseSchema>;
