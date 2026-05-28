import { z } from 'zod';
import { MasaWebhookStatus } from './masa.model';

export const masaPayloadSchema = z
  .object({
    verseau2DepotId: z.string(),
    numeroDepotVerseau1: z.string().nullable(),
    statut: z.enum(MasaWebhookStatus),
    rapport: z.string(),
  })
  .required()
  .strict();

export type MasaWebhookPayloadDto = z.infer<typeof masaPayloadSchema>;
