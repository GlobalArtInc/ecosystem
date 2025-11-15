import { z } from "zod";
import { userSchema } from "./user.schema";

export const getUserByIdRequestSchema = z.object({
  id: z.number().int(),
});

export const getUserByIdResponseSchema = userSchema;

export type GetUserByIdRequest = z.infer<typeof getUserByIdRequestSchema>;
export type GetUserByIdResponse = z.infer<typeof getUserByIdResponseSchema>;
