import { z } from "zod";
import { getUserByIdRequestSchema } from "./get-user-by-id.schema";
import { getUserByEmailRequestSchema } from "./get-user-by-email.schema";
import { getUsersByIdsRequestSchema } from "./get-user-by-ids.schema";
import { createOrUpdateUserRequestSchema } from "./create-or-update-user.schema";
import { roleServiceSchema } from "./role.schema";

export const userSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  fullName: z.string(),
  locale: z.string(),
});

export const userServiceSchema = z.object({
  getUserById: z.function({
    input: [getUserByIdRequestSchema],
    output: userSchema,
  }),
  getUserByEmail: z.function({
    input: [getUserByEmailRequestSchema],
    output: userSchema,
  }),
  createOrUpdateUser: z.function({
    input: [createOrUpdateUserRequestSchema],
    output: userSchema,
  }),
  getUsersByIds: z.function({
    input: [getUsersByIdsRequestSchema],
    output: z.object({
      users: z.map(z.number().int(), userSchema),
    }),
  }),
});

export type User = z.infer<typeof userSchema>;
export type UserService = z.infer<typeof userServiceSchema>;
export type RoleService = z.infer<typeof roleServiceSchema>;
