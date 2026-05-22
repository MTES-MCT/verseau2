import { z } from 'zod';
import { createPaginatedResponseSchema } from '../shared/pagination.schema';

export const MesureDtoSchema = z.object({
  ouvrageDepollutionCode: z.string(),
  ouvrageDepollutionNom: z.string().nullable(),
  systemeCollecteCode: z.string().nullable(),
  systemeCollecteNom: z.string().nullable(),
  pointMesureLocalisationCode: z.string().nullable(),
  pointAgenceEauNumero: z.string().nullable(),
  pointMesureNumero: z.string().nullable(),
  pointMesureLibelle: z.string().nullable(),
  prelevementDate: z.coerce.date().nullable(),
  parametreAnalyseCode: z.string(),
  parametreNomCourt: z.string().nullable(),
  resultatAnalyseValeur: z.number().nullable(),
  uniteMesureSymbole: z.string().nullable(),
  analyseFinalite: z.string().nullable(),
  resultatAnalyseStatut: z.string().nullable(),
  resultatAnalyseQualification: z.string().nullable(),
});

export type MesureDto = z.infer<typeof MesureDtoSchema>;

export const ParametreMesureSchema = z.object({
  parametreAnalyseCode: z.string(),
  parametreNomCourt: z.string().nullable(),
});

export type ParametreMesureDto = z.infer<typeof ParametreMesureSchema>;

export const MesuresGraphItemDtoSchema = MesureDtoSchema.extend({
  typeEvenementCode: z.string().nullable().optional(),
  typeEvenementLibelle: z.string().nullable().optional(),
  commentaire: z.string().nullable().optional(),
});

export type MesuresGraphItemDto = z.infer<typeof MesuresGraphItemDtoSchema>;

export const PaginatedMesuresResponseSchema = createPaginatedResponseSchema(MesureDtoSchema);

export type PaginatedMesuresResponse = z.infer<typeof PaginatedMesuresResponseSchema>;
