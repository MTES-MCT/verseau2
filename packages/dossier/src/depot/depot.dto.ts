import { z } from 'zod';
import { DepotStatus, EtapeMetier } from './depot.status';
import { AntivirusStatus } from '../antivirus/antivirus';

export const DepotDtoSchema = z.object({
  id: z.string(),
  numeroDepotVerseau1: z.string().nullish(),
  nomOriginalFichier: z.string(),
  status: z.enum(Object.values(DepotStatus)),
  // Omitted in older API payloads/fixtures means pending, never clean.
  antivirusStatus: z.enum(AntivirusStatus).optional(),
  etapeMetier: z.enum(Object.values(EtapeMetier)).nullish(),
  rapportPath: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type DepotDto = z.infer<typeof DepotDtoSchema>;
