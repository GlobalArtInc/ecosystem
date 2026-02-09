import { ID } from "./id.vo.js";
import { v4 } from "uuid";

export abstract class UUID extends ID {
  static createId() {
    return v4();
  }

  public get value(): number {
    return this.props.value;
  }
}
