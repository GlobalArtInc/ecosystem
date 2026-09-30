import { ClientGrpc } from "@nestjs/microservices";

export interface GrpcCallOptions {
  deadlineMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

const callOptions = new WeakMap<ClientGrpc, GrpcCallOptions>();

export const setGrpcCallOptions = (
  client: ClientGrpc,
  options: GrpcCallOptions,
): void => {
  callOptions.set(client, options);
};

export const getGrpcCallOptions = (client: ClientGrpc): GrpcCallOptions =>
  callOptions.get(client) ?? {};
