import { Controller, Get } from "@nestjs/common";
import { ClientMainGrpc } from "./client.grpc";
import { GrpcService, InjectGrpcService } from "@globalart/nestjs-grpc";

type Service = {
  GetDefault: () => {

  }
}

@Controller()
export class AppController {
  constructor(
    @InjectGrpcService()
    public readonly grpcService: GrpcService,
    public readonly client: ClientMainGrpc,
  ) {}

  @Get()
  async getDefault() {
    this.grpcService.addMetadata('test', 'test');
    await this.client.service<Service>('DefaultService').call('GetDefault');
  }
}
