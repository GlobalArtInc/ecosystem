import { z } from "zod";

export const dateFieldValue = z.date().nullable();

export type IDateFieldValue = z.infer<typeof dateFieldValue>;
