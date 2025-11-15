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
    const s1 = this.userService.getUsersByIds({ ids: [1, 2, 3] });
    console.log(s1.users);
    const s2 = await this.userService.getUsersByIds({ ids: [1, 2, 3] });
    console.log(s2.users);
  }
}
