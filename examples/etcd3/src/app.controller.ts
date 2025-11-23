import {
  ERROR_DESCRIPTIONS,
  SwaggerDocumentation,
} from "@globalart/nestjs-swagger";
import { Controller, Get, Inject } from "@nestjs/common";
import { EtcdLeaderElectionFeatureService } from "@globalart/nestjs-etcd";

@Controller()
export class AppController {
  constructor(
    @Inject(EtcdLeaderElectionFeatureService)
    private readonly etcdLeaderElectionFeatureService: EtcdLeaderElectionFeatureService
  ) {}
  @Get("hello")
  async hello() {
    return {
      message: "Hello World",
      isLeader: this.etcdLeaderElectionFeatureService.isLeader(),
    };
  }
}
