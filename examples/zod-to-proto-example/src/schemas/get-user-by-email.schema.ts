import { z } from "zod";
import { userSchema } from "./user.schema";

export const getUserByEmailRequestSchema = z.object({
  email: z.string(),
});

export const getUserByEmailResponseSchema = userSchema;

export type GetUserByEmailRequest = z.infer<typeof getUserByEmailRequestSchema>;
export type GetUserByEmailResponse = z.infer<
  typeof getUserByEmailResponseSchema
>;
