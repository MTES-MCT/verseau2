import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

export const EvenementSteuDtoSchema = z.object({
  prisEnCompte: z.boolean(),
  date: z.string(),
  ouvrageDepollutionCode: z.string(),
  ouvrageDepollutionNom: z.string().nullable(),
  typeEvenementCode: z.string(),
  typeEvenementLibelle: z.string(),
  finalite: z.string().nullable(),
  commentaire: z.string().nullable(),
});

export type EvenementSteuDto = z.infer<typeof EvenementSteuDtoSchema>;

export const EvenementSclDtoSchema = EvenementSteuDtoSchema.extend({
  systemeCollecteCode: z.string(),
  systemeCollecteNom: z.string().nullable(),
  pointMesureNumero: z.string(),
  pointMesureLibelle: z.string().nullable(),
});

export type EvenementSclDto = z.infer<typeof EvenementSclDtoSchema>;

export const PaginatedEvenementSteuResponseSchema = createPaginatedResponseSchema(EvenementSteuDtoSchema);
export type PaginatedEvenementSteuResponse = z.infer<typeof PaginatedEvenementSteuResponseSchema>;

export const PaginatedEvenementSclResponseSchema = createPaginatedResponseSchema(EvenementSclDtoSchema);
export type PaginatedEvenementSclResponse = z.infer<typeof PaginatedEvenementSclResponseSchema>;
