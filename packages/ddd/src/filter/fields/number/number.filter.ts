import { z } from 'zod';
import { $eq, $gt, $gte, $is_empty, $is_not_empty, $lt, $lte, $neq } from '../../operators';
import { baseFilter } from '../../base.filter';

export const numberFilterOperators = z.union([$eq, $neq, $gt, $gte, $lt, $lte, $is_empty, $is_not_empty]);
export type INumberFilterOperators = z.infer<typeof numberFilterOperators>;

export const numberFilterValue = z.number().nullable();
export const numberFilter = z
  .object({
    type: z.literal('number'),
    operator: numberFilterOperators,
    value: numberFilterValue,
  })
  .merge(baseFilter);

export type INumberFilter = z.infer<typeof numberFilter>;
export type INumberFilterValue = z.infer<typeof numberFilterValue>;
