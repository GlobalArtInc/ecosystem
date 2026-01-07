# @globalart/nestjs-grpc

A powerful NestJS module for building gRPC microservices with built-in support for Context propagation (CLS), Metadata management, and simplified Client abstraction.

## Features

- 🚀 **Simplified Client API**: Abstract class for creating strongly-typed gRPC clients.
- 🔄 **Context Propagation**: Automatically propagates `correlation-id` and metadata across microservices using `nestjs-cls`.
- 🛠 **Auto-Configuration**: Easy setup with `GrpcModule.forRoot`.
- 📦 **Metadata Management**: Helper service to read/write gRPC metadata within the request scope.

## Installation

```bash
npm install @globalart/nestjs-grpc @grpc/grpc-js @grpc/proto-loader nestjs-cls
# or
pnpm add @globalart/nestjs-grpc @grpc/grpc-js @grpc/proto-loader nestjs-cls
```

## Quick Start

### 1. Import GrpcModule

Import `GrpcModule` in your root `AppModule` to configure your gRPC clients.

```typescript
import { Module } from "@nestjs/common";
import { GrpcModule } from "@globalart/nestjs-grpc";
import { join } from "path";

@Module({
  imports: [
    GrpcModule.forRoot({
      clients: [
        {
          clientName: "USER_SERVICE", // Token name for injection
          packageName: "user", // Protobuf package name
          protoPath: join(__dirname, "proto/user.proto"),
          url: "localhost:50051",
        },
      ],
    }),
  ],
})
export class AppModule {}
```

### 2. Create a Client Service

Create a service that extends `AbstractGrpcClient` to wrap the gRPC calls. This provides type safety and automatic metadata handling.

```typescript
import { Injectable, Inject, OnModuleInit } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";
import { AbstractGrpcClient } from "@globalart/nestjs-grpc";
import { UserServiceClient, User, GetUserRequest } from "./proto/user"; // Your generated types

@Injectable()
export class UserGrpcService
  extends AbstractGrpcClient
  implements OnModuleInit
{
  private userService: UserServiceClient;

  constructor(
    @Inject("GRPC_CLIENT_USER_SERVICE") private readonly client: ClientGrpc
  ) {
    super(client);
  }

  onModuleInit() {
    this.userService = this.client.getService<UserServiceClient>("UserService");
  }

  async getUser(id: string): Promise<User> {
    // Method 1: Using the simplified 'call' helper (handles Observables conversion)
    // Automatically injects metadata and correlation-id
    return this.service<UserServiceClient>("UserService").call("getUser", {
      id,
    });
  }
}
```

### 3. Usage in Controllers

Just inject your service. The `correlation-id` will be automatically propagated from the incoming request (HTTP or gRPC) to the outgoing gRPC call.

```typescript
@Controller("users")
export class UserController {
  constructor(private readonly userGrpcService: UserGrpcService) {}

  @Get(":id")
  async getUser(@Param("id") id: string) {
    return this.userGrpcService.getUser(id);
  }
}
```

## Advanced Usage

### Working with Metadata

You can add custom metadata to the current request context, and it will be sent with all subsequent gRPC calls in the same trace.

```typescript
import { Injectable } from "@nestjs/common";
import { GrpcService } from "@globalart/nestjs-grpc";

@Injectable()
export class SomeService {
  constructor(private readonly grpcService: GrpcService) {}

  async someMethod() {
    // Add metadata for the current request scope
    await this.grpcService.addMetadata("x-custom-header", "some-value");

    // This metadata will be included in calls made by AbstractGrpcClient
  }
}
```

### Context Propagation (CLS)

This module uses `nestjs-cls` under the hood. It automatically initializes the CLS context for:

- Incoming HTTP requests (via middleware).
- Incoming gRPC requests (via interceptors/guards).

**Important**: If you encounter "No CLS context available" errors, ensure that your application's `AppModule` is correctly importing `GrpcModule` (which sets up CLS) or explicitly import `ClsModule.forRoot` if you need specific CLS configuration in your root module.

## Architecture

- **GrpcModule**: Configures clients and initializes CLS.
- **AbstractGrpcClient**: Base class that wraps `ClientGrpc` and handles RxJS to Promise conversion and Metadata injection.
- **GrpcService**: Scoped service to manage metadata within the current request.
