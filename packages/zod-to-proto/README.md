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

There are two ways to define gRPC services:

#### Option 1: Using Zod Schemas with Functions (Recommended)

```typescript
import { zodToProtobuf } from "@globalart/zod-to-proto";
import { z } from "zod";

// Define request/response schemas
const getUserByIdRequestSchema = z.object({
  id: z.number().int(),
});

const userSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
});

// Define service using z.function()
const userServiceSchema = z.object({
  getUserById: z.function({
    input: [getUserByIdRequestSchema],
    output: userSchema,
  }),
  createUser: z.function({
    input: [userSchema],
    output: z.object({
      id: z.number().int(),
      success: z.boolean(),
    }),
  }),
});

const protoDefinition = zodToProtobuf(z.object(), {
  packageName: "user.service",
  services: {
    UserService: userServiceSchema,
  },
});

console.log(protoDefinition);
```

#### Option 2: Using Service Definitions Array

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

Both approaches produce the same output:

```protobuf
syntax = "proto3";
package user.service;

message GetUserByIdRequest {
  int32 id = 1;
}

message GetUserByIdResponse {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

message CreateUserRequest {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

message CreateUserResponse {
  int32 id = 1;
  bool success = 2;
}

service UserService {
  rpc GetUserById(GetUserByIdRequest) returns (GetUserByIdResponse);
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
}
```

## API

### `zodToProtobuf(schema?, options?)`

Converts a Zod schema to a Protobuf definition.

#### Parameters

- `schema` (optional): `ZodTypeAny` - Root Zod schema to convert
- `options` (optional): `ZodToProtobufOptions` - Configuration options

### `zodToProtobufService(options?)`

Convenience wrapper for generating only gRPC service definitions without passing an explicit root schema.

```typescript
import { zodToProtobufService } from "@globalart/zod-to-proto";
import { z } from "zod";

const userServiceSchema = z.object({
  getUserById: z.function({
    input: [z.object({ id: z.number().int() })],
    output: z.object({
      id: z.number().int(),
      name: z.string(),
    }),
  }),
});

const protoDefinition = zodToProtobufService({
  packageName: "user.service",
  services: {
    UserService: userServiceSchema,
  },
});
```

#### Options

```typescript
interface ZodToProtobufOptions {
  packageName?: string;                              // Protobuf package name (default: "default")
  rootMessageName?: string;                          // Root message name (default: "Message")
  typePrefix?: string;                               // Prefix for message and enum types
  services?: ServicesInput;                          // gRPC service definitions
  skipRootMessage?: boolean;                         // Skip root message generation
}

type ServicesInput = ServiceDefinition[] | Record<string, ZodObject<any>>;
```

#### Service Definition

You can define services in two ways:

**Option 1: Using Zod Schemas (Recommended)**

```typescript
const serviceSchema = z.object({
  methodName: z.function({
    input: [requestSchema],
    output: responseSchema,
  }),
  // ... more methods
});

// Use in options
const proto = zodToProtobuf(z.object(), {
  services: {
    ServiceName: serviceSchema,
  },
});
```

**Option 2: Using Service Definitions Array**

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
- `z.map()` → `map<keyType, valueType>` (key must be int32, int64, string, or bool)
- `z.record()` → `map<keyType, valueType>` (same as z.map())
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
  settings: z.record(z.string(), z.string()),
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

## Advanced Usage

### Working with Maps and Records

Protobuf maps have strict key type requirements. Only integral types, strings, and booleans are allowed as keys. Both `z.map()` and `z.record()` are converted to protobuf `map<>` type:

```typescript
const schema = z.object({
  // ✅ Valid map keys
  usersByStringId: z.map(z.string(), userSchema),
  usersByIntId: z.map(z.number().int(), userSchema),
  flagsMap: z.map(z.boolean(), z.string()),
  
  // ✅ Using z.record() - same as z.map()
  metadataRecord: z.record(z.string(), z.string()),
  settingsRecord: z.record(z.string(), z.number()),
  
  // ❌ Invalid - double is not allowed as map key
  invalidMap: z.map(z.number(), userSchema), // Use .int() instead!
});
```

### Type-Safe Service Definitions

When using Zod schemas for services, you get full TypeScript type safety:

```typescript
const userServiceSchema = z.object({
  getUser: z.function({
    input: [z.object({ id: z.number().int() })],
    output: userSchema,
  }),
});

type UserService = z.infer<typeof userServiceSchema>;

// Implementation with type checking
class UserServiceImpl implements UserService {
  async getUser({ id }: { id: number }) {
    // TypeScript knows the shape of input and output
    return { id, name: "John", email: "john@example.com" };
  }
}
```

### Avoiding Circular Dependencies

**Important:** Avoid circular dependencies between schema files. Circular imports will cause types to become `undefined` during schema construction.

❌ **Bad Example:**
```typescript
// user.schema.ts
import { getUserByIdResponseSchema } from "./get-user-by-id.schema";

export const userSchema = z.object({ ... });

export const userServiceSchema = z.object({
  getUserById: z.function({
    input: [...],
    output: getUserByIdResponseSchema, // ❌ Circular dependency
  }),
});

// get-user-by-id.schema.ts
import { userSchema } from "./user.schema"; // ❌ Circular dependency

export const getUserByIdResponseSchema = userSchema;
```

✅ **Good Example:**
```typescript
// user.schema.ts
import { getUserByIdRequestSchema } from "./get-user-by-id.schema";

export const userSchema = z.object({ ... });

export const userServiceSchema = z.object({
  getUserById: z.function({
    input: [getUserByIdRequestSchema],
    output: userSchema, // ✅ Direct reference, no circular dependency
  }),
});

// get-user-by-id.schema.ts
export const getUserByIdRequestSchema = z.object({ id: z.number().int() });
// No import of userSchema needed
```

### Multiple Services

You can define multiple services in a single protobuf file:

```typescript
const protoDefinition = zodToProtobuf(z.object(), {
  packageName: "api.v1",
  services: {
    UserService: userServiceSchema,
    AuthService: authServiceSchema,
    ProductService: productServiceSchema,
  },
});
```

## Limitations

- Only the types listed above are supported
- Unsupported types will throw `UnsupportedTypeException`
- Nested objects are automatically converted to separate messages
- Enum values are converted to numbers starting from 0
- Map keys must be integral types (int32, int64, etc.), strings, or booleans - **not** doubles or floats
- Avoid circular dependencies between schema files

## License

MIT
