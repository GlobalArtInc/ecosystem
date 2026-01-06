import { InjectGrpcClient } from "@globalart/nestjs-grpc";
import { AbstractGrpcClient } from "@globalart/nestjs-grpc";
import { Injectable } from "@nestjs/common";
import { ClientGrpc } from "@nestjs/microservices";

@Injectable()
export class ClientMainGrpc extends AbstractGrpcClient {
  constructor(@InjectGrpcClient("default") client: ClientGrpc) {
    super(client);
  }
}
