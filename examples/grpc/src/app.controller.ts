import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ClientMainGrpc } from "./client.grpc";
import { GrpcService, InjectGrpcClient } from "@globalart/nestjs-grpc";

@Controller()
export class AppController {
  constructor(
    @InjectGrpcClient('default') private readonly client: any,
    private readonly grpcService: GrpcService,
  ) {}

  @GrpcMethod('DefaultService', 'GetDefault')
  async getDefault() {
    this.grpcService.addMetadata('test', 'test');
    const metadata = this.grpcService.getMetadata();
    console.log(metadata);
    return {
      id: 1,
      message: "Hello World",
    };
  }
}
