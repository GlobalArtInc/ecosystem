import { AbstractGrpcClient, GrpcService } from "@globalart/nestjs-grpc";
import { Injectable } from "@nestjs/common";
import { InjectGrpcClient } from "@globalart/nestjs-grpc";
import { ClientGrpc } from "@nestjs/microservices";

@Injectable()
export class ClientMainGrpc extends AbstractGrpcClient {
  constructor(
    @InjectGrpcClient('default') client: ClientGrpc,
    grpcService: GrpcService,
  ) {
    super(client, grpcService);
  }
}
