// @ts-nocheck
import { createZodDto } from "@globalart/nestjs-zod";
import { z } from "zod";

const paginationMetaSchema = z.object({
  totalItems: z.number().int().min(0),
  itemCount: z.number().int().min(0),
  itemsPerPage: z.number().int().min(1),
  totalPages: z.number().int().min(1),
  currentPage: z.number().int().min(1),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export class PaginationMetaDto extends createZodDto(paginationMetaSchema) {}

export function createPaginationResponseDto<T extends z.ZodType>(
  itemSchema: T
) {
  const schema = z.object({
    items: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

  return createZodDto(schema);
}

