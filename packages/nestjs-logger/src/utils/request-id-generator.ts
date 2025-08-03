import { Injectable } from "@nestjs/common";
import { IRequestIdGenerator } from "../contracts";
import { randomBytes } from "crypto";

@Injectable()
export class RequestIdGenerator implements IRequestIdGenerator {
  private counter = 0;
  private readonly machineId: string;

  constructor() {
    this.machineId = this.generateMachineId();
  }

  generate(): string {
    const timestamp = Date.now().toString(36);
    const counter = (++this.counter).toString(36);
    const random = randomBytes(2).toString("hex");

    return `${timestamp}-${this.machineId}-${counter}-${random}`;
  }

  private generateMachineId(): string {
    return randomBytes(3).toString("hex");
  }
}
