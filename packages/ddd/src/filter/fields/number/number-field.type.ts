import { z } from 'zod';

export const numberFieldValue = z.number().or(z.null());
export type INumberFieldValue = z.infer<typeof numberFieldValue>;
