import { createZodDto } from "@globalart/nestjs-zod";
import { z } from "zod";

const filterOperatorSchema = z.enum([
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "in",
  "between",
]);

export type FilterOperator = z.infer<typeof filterOperatorSchema>;

export interface FilterInput {
  field: string;
  operator: FilterOperator;
  value: string | number | string[];
}

const filterSchema = z.object({
  field: z.string(),
  operator: filterOperatorSchema,
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const filtersPreprocessor = (val: unknown): unknown => {
  if (!val) return undefined;
  if (Array.isArray(val)) return val;

  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  if (typeof val === "object") {
    const filters: FilterInput[] = [];

    for (const key in val) {
      const match = key.match(/^(\d+)\[(\w+)\]$/);
      if (match) {
        const [, indexStr, prop] = match;
        const index = parseInt(indexStr, 10);

        if (!filters[index]) {
          filters[index] = {} as FilterInput;
        }

        if (prop === "field" || prop === "operator" || prop === "value") {
          (filters[index] as unknown as Record<string, unknown>)[prop] = (
            val as Record<string, unknown>
          )[key];
        }
      }
    }

    const validFilters = filters.filter(
      (f) => f && f.field && f.operator && f.value !== undefined
    );

    return validFilters.length > 0 ? validFilters : undefined;
  }

  return undefined;
};

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.string().optional(),
  filters: z.preprocess(filtersPreprocessor, z.array(filterSchema).optional()),
});

export class PaginationQueryDto extends createZodDto(paginationQuerySchema) {}
