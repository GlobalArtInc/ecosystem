import { z } from "zod";
import { baseFilter } from "../../base.filter";
import {
  $eq,
  $neq
} from "../../operators";

export const booleanFilterOperators = z.union([
  $eq,
  $neq,
]);

export const booleanFilterValue = z.boolean().nullable();
export const booleanFilter = z
  .object({
    type: z.literal("boolean"),
    operator: booleanFilterOperators,
    value: booleanFilterValue,
  })
  .merge(baseFilter);

export type IBooleanFilter = z.infer<typeof booleanFilter>;
export type IBooleanFilterOperator = z.infer<typeof booleanFilterOperators>;
