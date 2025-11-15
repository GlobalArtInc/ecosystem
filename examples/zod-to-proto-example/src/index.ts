import { zodToProtobuf } from "@globalart/zod-to-proto";
import z from "zod";
import { roleServiceSchema } from "./schemas/role.schema";
import { userServiceSchema } from "./schemas/user.schema";
import fs from "fs";

export const userServiceZodToProto = zodToProtobuf(z.object(), {
  services: {
    UserService: userServiceSchema,
    RoleService: roleServiceSchema,
  },
});

console.log(
  zodToProtobuf(z.object(), {
    services: {
      TestService: z.object({
        test: z.function({
          input: [
            z.object({
              id: z.number().int(),
            }),
          ],
          output: z.record(z.string(), z.number().int()),
        }),
      }),
    },
  })
);

fs.writeFileSync("./user-service.proto", userServiceZodToProto);
