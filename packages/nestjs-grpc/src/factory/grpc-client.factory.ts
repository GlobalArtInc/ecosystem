import { Injectable } from "@nestjs/common";
import {
  ClientGrpc,
  ClientProxyFactory,
  Transport,
} from "@nestjs/microservices";
import { GrpcLoader } from "../core/grpc.config";

@Injectable()
export class GrpcClientFactory {
  private clients = new Map<string, ClientGrpc>();

  public createClient(options: {
    package: string;
    protoPath: string;
    url: string;
    loader?: GrpcLoader;
  }) {
    return ClientProxyFactory.create({
      transport: Transport.GRPC,
      options,
    });
  }

  public register(token: string, client: ClientGrpc) {
    this.clients.set(token, client);
  }

  public getClient<T extends ClientGrpc = ClientGrpc>(token: string): T {
    const client = this.clients.get(token);

    if (!client) {
      throw new Error(`Grpc client "${token}" not found`);
    }

    return client as T;
  }
}
