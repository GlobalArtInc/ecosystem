import { z } from "zod";
import {
  $between,
  $eq,
  $gt,
  $gte,
  $is_not_today,
  $is_today,
  $is_tomorrow,
  $is_yesterday,
  $lt,
  $lte,
  $neq,
} from "../../operators";
import { baseFilter } from "../../base.filter";

export const dateFilterOperators = z.union([
  $eq,
  $neq,
  $gt,
  $gte,
  $lt,
  $lte,
  $between,
  $is_today,
  $is_tomorrow,
  $is_yesterday,
  $is_not_today,
]);

export const dateFilterValue = z
  .string()
  .nullable()
  .or(z.tuple([z.string(), z.string()]));
export const dateFilter = z
  .object({
    type: z.literal("date"),
    operator: dateFilterOperators,
    value: dateFilterValue,
  })
  .merge(baseFilter);

export type IDateFilter = z.infer<typeof dateFilter>;
export type IDateFilterValue = z.infer<typeof dateFilterValue>;
export type IDateFilterOperator = z.infer<typeof dateFilterOperators>;
