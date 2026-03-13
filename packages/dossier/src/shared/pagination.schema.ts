import { z } from 'zod';

export function createPaginationQuerySchema<T extends z.ZodTypeAny = z.ZodString>(sortBySchema?: T) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: (sortBySchema ?? z.string()).optional() as z.ZodOptional<T extends undefined ? z.ZodString : T>,
    sortOrder: z.enum(['ASC', 'DESC']).optional(),
  });
}

/** Generic pagination schema — sortBy is an unconstrained string. */
export const PaginationQuerySchema = createPaginationQuerySchema();

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });
}
