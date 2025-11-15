import z from "zod";

export const getUsersByIdsRequestSchema = z.object({
  ids: z.array(z.number().int()),
});

export type GetUsersByIdsRequest = z.infer<typeof getUsersByIdsRequestSchema>;
