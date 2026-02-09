// @ts-nocheck
import { createZodDto } from "@globalart/nestjs-zod";
import { z } from "zod";

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(["forward", "backward"]).default("forward"),
  sort: z.string().optional(),
});

export class CursorPaginationQueryDto extends createZodDto(
  cursorPaginationQuerySchema
) {}

