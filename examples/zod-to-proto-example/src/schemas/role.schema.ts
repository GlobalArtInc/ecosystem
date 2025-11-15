import { z } from "zod";

export const roleSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  level: z.number().int(),
});

export type Role = z.infer<typeof roleSchema>;

export const roleServiceSchema = z.object({
  getRoles: z.function({
    input: [z.object({})],
    output: z.array(roleSchema),
  }),
});

export type RoleServiceSchema = z.infer<typeof roleServiceSchema>;
