# @globalart/proto-to-zod

A library for converting Protobuf definitions to Zod schemas. Automatically generates Zod schemas from `.proto` files.

## Installation

```bash
npm install @globalart/proto-to-zod zod protobufjs
```

## Usage

```typescript
import { protoToZod } from "@globalart/proto-to-zod";
import * as fs from "fs";

const protoContent = `
syntax = "proto3";
package example;

enum UserRole {
  UNKNOWN = 0;
  USER = 1;
  ADMIN = 2;
}

message User {
  string id = 1;
  string name = 2;
  int32 age = 3;
  UserRole role = 4;
}
`;

const zodSchemas = protoToZod(protoContent);
console.log(zodSchemas);
// Outputs TypeScript code with Zod schemas:
// export enum UserRole { ... }
// export const UserRoleSchema = z.nativeEnum(UserRole);
// export const UserSchema = z.object({ ... });
```

## Features

- Converts Messages to Zod objects
- Converts Enums to TypeScript enums and Zod native enums
- Handles nested types
- Handles repeated fields (arrays)
- Handles optional fields

## License

MIT
