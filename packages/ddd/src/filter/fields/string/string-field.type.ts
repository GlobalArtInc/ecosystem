import { z } from "zod";

export const stringFieldValue = z.string().nullable();
export type IStringFieldValue = z.infer<typeof stringFieldValue>;
