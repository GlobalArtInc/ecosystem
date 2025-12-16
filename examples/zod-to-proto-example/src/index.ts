import { zodToProtobufService } from "@globalart/zod-to-proto";
import z from "zod";
import { roleServiceSchema } from "./schemas/role.schema";
import { userServiceSchema } from "./schemas/user.schema";
import fs from "fs";

export const getProjectUsersRequestSchema = z.object({
  projectId: z.number().int(),
});
export const getProjectUsersResponseSchema = z.object({
  users: z.array(
    z.object({
      id: z.number().int(),
      projectId: z.number().int(),
      userId: z.number().int(),
      role: z.string(),
      isActive: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
      floatValue: z.float32(),
      numberValue: z.number(),
      bytes: z.instanceof(Buffer),
      user: z.object({
        id: z.number().int(),
        name: z.string(),
        email: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
    })
  ),
});

const func = z.object({
  getTest: z.function({
    input: [getProjectUsersRequestSchema],
    output: getProjectUsersResponseSchema,
  }),
});

console.log(
  zodToProtobufService({
    services: {
      TestService: func,
    },
  })
);

const testServiceProto = zodToProtobufService({
  services: {
    TestService: func,
  },
});

console.log(testServiceProto);
