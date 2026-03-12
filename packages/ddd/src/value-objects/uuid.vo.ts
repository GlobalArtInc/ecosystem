import { ID } from "./id.vo.js";
import { v4 } from "uuid";
import z from "zod";

export const uuidSchema = z.uuid();
export type IUuid = z.infer<typeof uuidSchema>;

export abstract class UUID extends ID {
  static createId() {
    return v4();
  }

  public get value(): number {
    return this.props.value;
  }
}
