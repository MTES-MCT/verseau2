import { z } from 'zod';
import { DepotStatus, EtapeMetier } from './depot.status';

export const DepotDtoSchema = z.object({
  id: z.string(),
  numeroDepotVerseau1: z.string().nullish(),
  nomOriginalFichier: z.string(),
  status: z.enum(Object.values(DepotStatus)),
  etapeMetier: z.enum(Object.values(EtapeMetier)).nullish(),
  rapportPath: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type DepotDto = z.infer<typeof DepotDtoSchema>;
