import { z } from 'zod';

// TODO: base sort with possibility limit sorting fields for concrete entity
export const sortingSchema = z.record(z.string(), z.enum(['ASC', 'DESC']));

export type ISorting = z.infer<typeof sortingSchema>;
