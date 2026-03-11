import { z } from 'zod';

export const MesureDtoSchema = z.object({
  steuSandreCda: z.string(),
  steuNom: z.string().nullable(),
  sclSandreCda: z.string().nullable(),
  sclNom: z.string().nullable(),
  localisationPoint: z.string().nullable(),
  numPointAgence: z.string().nullable(),
  numPoint: z.string().nullable(),
  nomPoint: z.string().nullable(),
  date: z.coerce.date().nullable(),
  parametreCode: z.string(),
  parametreNom: z.string().nullable(),
  valeur: z.number().nullable(),
  unite: z.string().nullable(),
  finalite: z.string().nullable(),
  statut: z.string().nullable(),
  qualification: z.string().nullable(),
});

export type MesureDto = z.infer<typeof MesureDtoSchema>;

export const PaginatedMesuresResponseSchema = z.object({
  data: z.array(MesureDtoSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type PaginatedMesuresResponse = z.infer<typeof PaginatedMesuresResponseSchema>;
