import z from "zod";
import { ValueObject } from "./value-object.js";

const emailSchema = z.email();

export class EmailVO extends ValueObject<string> {
  constructor(value: string) {
    super({ value });
  }

  static create(value: string) {
    return new this(emailSchema.parse(value));
  }

  public get value(): string {
    return this.props.value;
  }
}
