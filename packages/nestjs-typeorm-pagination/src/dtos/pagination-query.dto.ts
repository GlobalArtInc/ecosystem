import { createZodDto } from "@globalart/nestjs-zod";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export const paginationQuerySchema = z.object({
  limit: z.number().int().min(1).optional(),
  offset: z.number().int().optional(),
  filter: z.array(z.string()).optional(),
  orderBy: z.enum(["ASC", "DESC"]).optional(),
  sortBy: z.string().optional(),
});

export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}
