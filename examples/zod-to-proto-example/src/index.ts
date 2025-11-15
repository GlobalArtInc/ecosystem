import { zodToProtobuf } from "@globalart/zod-to-proto";
import z from "zod";
import { roleServiceSchema } from "./schemas/role.schema";
import { UserService, userServiceSchema } from "./schemas/user.schema";

export const userServiceZodToProto = zodToProtobuf(z.object(), {
  services: {
    UserService: userServiceSchema,
    RoleService: roleServiceSchema,
  },
});

console.log(userServiceZodToProto);

class Test {
  constructor(private readonly userService: UserService) {}

  async test() {
    console.log(this.userService.getUsersByIds({ ids: [1, 2, 3] }));
  }
}
