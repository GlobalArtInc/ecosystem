import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.coerce.number().positive().int().optional(),
  offset: z.coerce.number().nonnegative().int().optional(),
});

export type IPagination = z.infer<typeof paginationSchema>;

export const paginatedResponseSchema = paginationSchema.extend({
  total: z.number().nonnegative().int(),
});
