import { z } from 'zod';
import { BaseEntitySchema } from '../baseEntity';

export enum MasaStatus {
  REFUSE = 'REFUSE',
  INTEGRE = 'INTEGRE',
  INTEGRATION_PARTIELLE = 'INTEGRATION_PARTIELLE',
}

export const MasaDtoSchema = BaseEntitySchema.extend({
  id: z.string(),
  numeroDepotVerseau1: z.string().nullable(),
  statut: z.nativeEnum(MasaStatus),
  rapport: z.string().nullable(),
});

export type MasaDto = z.infer<typeof MasaDtoSchema>;
