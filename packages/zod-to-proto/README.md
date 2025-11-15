# @globalart/zod-to-proto

A library for converting Zod schemas to Protobuf definitions. Automatically generates `.proto` files from Zod validation schemas, including support for gRPC services.

## Installation

```bash
npm install @globalart/zod-to-proto zod
```

or

```bash
yarn add @globalart/zod-to-proto zod
```

or

```bash
pnpm add @globalart/zod-to-proto zod
```

## Quick Start

### Basic Usage

```typescript
import { zodToProtobuf } from "@globalart/zod-to-proto";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

const protoDefinition = zodToProtobuf(schema, {
  packageName: "user.service",
});

console.log(protoDefinition);
```

Output:

```protobuf
syntax = "proto3";
package user.service;

message Message {
  string name = 1;
  int32 age = 2;
  string email = 3;
}
```

### Generating gRPC Services

```typescript
import { zodToProtobuf } from "@globalart/zod-to-proto";
import { z } from "zod";

const protoDefinition = zodToProtobuf(z.object(), {
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
        {
          name: "createUser",
          request: z.object({
            name: z.string(),
            age: z.number(),
            email: z.string(),
          }),
          response: z.object({
            id: z.string(),
            success: z.boolean(),
          }),
        },
      ],
    },
  ],
});

console.log(protoDefinition);
```

Output:

```protobuf
syntax = "proto3";
package user.service;

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  string name = 1;
  int32 age = 2;
  string email = 3;
}

message CreateUserRequest {
  string name = 1;
  int32 age = 2;
  string email = 3;
}

message CreateUserResponse {
  string id = 1;
  bool success = 2;
}

service UserService {
  rpc getUser(GetUserRequest) returns (GetUserResponse);
  rpc createUser(CreateUserRequest) returns (CreateUserResponse);
}
```

## API

### `zodToProtobuf(schema?, options?)`

Converts a Zod schema to a Protobuf definition.

#### Parameters

- `schema` (optional): `ZodTypeAny` - Root Zod schema to convert
- `options` (optional): `ZodToProtobufOptions` - Configuration options

#### Options

```typescript
interface ZodToProtobufOptions {
  packageName?: string;           // Protobuf package name (default: "default")
  rootMessageName?: string;       // Root message name (default: "Message")
  typePrefix?: string;            // Prefix for message and enum types
  services?: ServiceDefinition[]; // gRPC service definitions
  skipRootMessage?: boolean;      // Skip root message generation
}
```

#### Service Definition

```typescript
interface ServiceDefinition {
  name: string;        // Service name
  methods: ServiceMethod[];
}

interface ServiceMethod {
  name: string;                    // Method name
  request: ZodTypeAny;              // Request Zod schema
  response: ZodTypeAny;             // Response Zod schema
  streaming?: "client" | "server" | "bidirectional"; // Streaming type (optional)
}
```

## Supported Zod Types

### Basic Types

- `z.string()` → `string`
- `z.number()` → `int32` (or `int64`, `float`, `double` depending on validation)
- `z.boolean()` → `bool`
- `z.bigint()` → `int64`
- `z.date()` → `string`

### Collections

- `z.array()` → `repeated`
- `z.set()` → `repeated`
- `z.map()` → `map<keyType, valueType>`
- `z.tuple()` → nested message

### Complex Types

- `z.object()` → nested message
- `z.enum()` → `enum`
- `z.optional()` → `optional`
- `z.nullable()` → `optional`

### Examples

```typescript
import { zodToProtobuf } from "@globalart/zod-to-proto";
import { z } from "zod";

const schema = z.object({
  id: z.string(),
  tags: z.array(z.string()),
  metadata: z.map(z.string(), z.number()),
  status: z.enum(["active", "inactive", "pending"]),
  profile: z.object({
    firstName: z.string(),
    lastName: z.string(),
    age: z.number().optional(),
  }),
  coordinates: z.tuple([z.number(), z.number()]),
});

const protoDefinition = zodToProtobuf(schema, {
  packageName: "example",
});
```

## Usage Examples

### With Custom Type Prefix

```typescript
const protoDefinition = zodToProtobuf(schema, {
  packageName: "api.v1",
  typePrefix: "ApiV1",
  rootMessageName: "User",
});
```

### With Streaming Methods

```typescript
const protoDefinition = zodToProtobuf(z.object(), {
  packageName: "chat.service",
  services: [
    {
      name: "ChatService",
      methods: [
        {
          name: "sendMessage",
          request: z.object({ message: z.string() }),
          response: z.object({ success: z.boolean() }),
        },
        {
          name: "streamMessages",
          request: z.object({ roomId: z.string() }),
          response: z.object({ message: z.string() }),
          streaming: "server",
        },
        {
          name: "chat",
          request: z.object({ message: z.string() }),
          response: z.object({ message: z.string() }),
          streaming: "bidirectional",
        },
      ],
    },
  ],
});
```

### Without Root Message

```typescript
const protoDefinition = zodToProtobuf(schema, {
  packageName: "example",
  skipRootMessage: true,
  services: [
    {
      name: "ExampleService",
      methods: [
        {
          name: "doSomething",
          request: z.object({ input: z.string() }),
          response: z.object({ output: z.string() }),
        },
      ],
    },
  ],
});
```

## Limitations

- Only the types listed above are supported
- Unsupported types will throw `UnsupportedTypeException`
- Nested objects are automatically converted to separate messages
- Enum values are converted to numbers starting from 0

## License

MIT
