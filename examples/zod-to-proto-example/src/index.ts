import { zodToProtobuf } from "@globalart/zod-to-proto";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

console.log(
  zodToProtobuf(z.object(), {
    packageName: "user.service",
    services: [
      {
        name: "UserService",
        methods: [
          {
            name: "getUser",
            request: z.object({
              id: z.string(),
            }),
            response: z.object({
              name: z.string(),
              age: z.number(),
              email: z.string(),
            }),
          },
        ],
      },
    ],
  })
);
