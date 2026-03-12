import z from "zod";
import { ValueObject } from "./value-object.js";

const emailSchema = z.email();
export type IEmail = z.infer<typeof emailSchema>;

export class EmailVO extends ValueObject<IEmail> {
  constructor(value: IEmail) {
    super({ value });
  }

  static create(value: IEmail) {
    return new this(emailSchema.parse(value));
  }

  public get value(): IEmail {
    return this.props.value;
  }
}
