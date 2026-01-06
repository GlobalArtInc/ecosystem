import { Metadata } from '@grpc/grpc-js';
import { Controller } from "@nestjs/common";
import { GrpcMethod } from "@nestjs/microservices";
import { ClientMainGrpc } from "./client.grpc";
import { GrpcService, InjectGrpcClient, InjectGrpcService } from "@globalart/nestjs-grpc";

@Controller()
export class AppController {
  constructor(
    private readonly client: ClientMainGrpc,
    @InjectGrpcService()
    private readonly grpcService: GrpcService,
  ) {}

  @GrpcMethod('DefaultService', 'GetDefault')
  async getDefault() {
    this.grpcService.addMetadata('test', 'test');
    await this.client.service<any>('DefaultService').call('GetDefault2');
    return {
      id: 1,
      message: "Hello World",
    };
  }

  @GrpcMethod('DefaultService', 'GetDefault2')
  async getDefaults2(data: any, metadata: Metadata) {
    console.log(metadata.getMap(), 'getDefaults2');
    await this.client.service<any>('DefaultService').call('GetDefault3');
    return {
      id: 1,
      message: "Hello World",
    };
  }

  @GrpcMethod('DefaultService', 'GetDefault3')
  async getDefaults3(data: any, metadata: Metadata) {
    console.log(metadata.getMap(), 'getDefaults3');
    return {
      id: 1,
      message: "Hello World",
    };
  }
}
