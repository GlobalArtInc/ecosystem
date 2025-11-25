import { createZodDto } from "@globalart/nestjs-zod";
import { z } from "zod";

export const paginationQuerySchema = z.object({
  limit: z.number().int().min(1).optional(),
  offset: z.number().int().optional(),
  filter: z.array(z.string()).optional(),
  orderBy: z.string().optional(),
  sortBy: z.enum(["ASC", "DESC"]).optional(),
});

export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}
