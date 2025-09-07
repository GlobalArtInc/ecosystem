import { z } from 'zod';

export const baseFilter = z.object({
  field: z.string().min(1),
  relation: z.string().min(1).optional(),
});
