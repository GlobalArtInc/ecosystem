import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ClientMainGrpc } from "./client.grpc";
import { InjectGrpcClient } from "@globalart/nestjs-grpc";

@Controller()
export class AppController {
  constructor(
    @InjectGrpcClient('default') private readonly client: any,
  ) {}

  @GrpcMethod('DefaultService', 'GetDefault')
  async getDefault() {
    return {
      id: 1,
      message: "Hello World",
    };
  }
}
