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

fs.writeFileSync("./user-service.proto", userServiceZodToProto);
