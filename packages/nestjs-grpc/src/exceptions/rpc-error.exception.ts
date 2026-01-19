import { RpcException } from "@nestjs/microservices";
import { RpcStatus } from "../enums/rpc-status.enum";

export class RpcErrorException extends RpcException {
  constructor(message: string, code = RpcStatus.UNKNOWN) {
    super({
      message,
      code,
    });
  } 
}