import { z } from 'zod';
import { MasaStatus } from './masa.model';

export const masaPayloadSchema = z
  .object({
    verseau2DepotId: z.string(),
    numeroDepotVerseau1: z.string(),
    statut: z.enum(MasaStatus),
    rapport: z.string(),
  })
  .required()
  .strict();

export type MasaWebhookPayloadDto = z.infer<typeof masaPayloadSchema>;
