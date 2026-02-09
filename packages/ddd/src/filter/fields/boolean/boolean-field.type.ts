import { z } from "zod";

export const booleanFieldValue = z.boolean().nullable();
export type IBooleanFieldValue = z.infer<typeof booleanFieldValue>;
