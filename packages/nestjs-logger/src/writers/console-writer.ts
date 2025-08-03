import { Injectable } from "@nestjs/common";
import { ILogWriter } from "../contracts";

@Injectable()
export class ConsoleWriter implements ILogWriter {
  write(formattedLog: string): void {
    console.log(formattedLog);
  }
}
