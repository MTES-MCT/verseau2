import { z } from 'zod';

export const masaPayloadSchema = z
  .object({
    versau2DepotId: z.string(),
    numeroDepotVerseau1: z.string(),
    statut: z.string(),
    rapport: z.string(),
  })
  .required()
  .strict();
