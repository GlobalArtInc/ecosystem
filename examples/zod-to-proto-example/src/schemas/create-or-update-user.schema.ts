import { z } from "zod";
import { userSchema } from "./user.schema";

export const createOrUpdateUserRequestSchema = z.object({
  user: userSchema,
});

export const createOrUpdateUserResponseSchema = userSchema;

export type CreateOrUpdateUserRequest = z.infer<
  typeof createOrUpdateUserRequestSchema
>;
export type CreateOrUpdateUserResponse = z.infer<
  typeof createOrUpdateUserResponseSchema
>;
