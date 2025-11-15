import z from "zod";
import { roleSchema } from "./role.schema";

export const getRolesRequestSchema = z.object({});
export const getRolesResponseSchema = z.object({
  roles: z.array(roleSchema),
  total: z.number().int(),
});

export type GetRolesRequest = z.infer<typeof getRolesRequestSchema>;
export type GetRolesResponse = z.infer<typeof getRolesResponseSchema>;
