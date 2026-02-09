import { RpcException } from "@nestjs/microservices";
import { RpcStatus } from "../enums/rpc-status.enum";

export class RpcErrorException extends RpcException {
  public readonly message: string;
  public readonly code: RpcStatus;

  constructor(message: string, code = RpcStatus.UNKNOWN) {
    super(message);
    this.message = message;
    this.code = code;
  } 
}