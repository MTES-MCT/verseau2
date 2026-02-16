import { z } from 'zod';

export const BaseEntitySchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
