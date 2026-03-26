import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

export const MesureDtoSchema = z.object({
  codeOuvrageDepollution: z.string(),
  nomOuvrageDepollution: z.string().nullable(),
  codeSystemeCollecte: z.string().nullable(),
  nomSystemeCollecte: z.string().nullable(),
  codeLocalisationPointMesure: z.string().nullable(),
  numeroPointAgenceEau: z.string().nullable(),
  numeroPointMesure: z.string().nullable(),
  libellePointMesure: z.string().nullable(),
  datePrelevement: z.coerce.date().nullable(),
  codeParametreAnalyse: z.string(),
  nomCourtParametre: z.string().nullable(),
  valeurResultatAnalyse: z.number().nullable(),
  symboleUniteMesure: z.string().nullable(),
  finaliteAnalyse: z.string().nullable(),
  statutResultatAnalyse: z.string().nullable(),
  qualificationResultatAnalyse: z.string().nullable(),
});

export type MesureDto = z.infer<typeof MesureDtoSchema>;

export const PaginatedMesuresResponseSchema = createPaginatedResponseSchema(MesureDtoSchema);

export type PaginatedMesuresResponse = z.infer<typeof PaginatedMesuresResponseSchema>;
