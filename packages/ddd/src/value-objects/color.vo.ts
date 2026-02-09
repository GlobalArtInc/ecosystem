import z from "zod";
import { ValueObject } from "./value-object.js";

const colorSchema = z.hex();

export class ColorVO extends ValueObject<string> {
  constructor(value: string) {
    super({ value });
  }

  static create(value: string) {
    return new this(colorSchema.parse(value));
  }

  public get value(): string {
    return this.props.value;
  }
}
