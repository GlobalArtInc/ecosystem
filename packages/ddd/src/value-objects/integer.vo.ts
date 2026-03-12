import { ValueObject } from "./value-object.js";
import z from "zod";

export const integerSchema = z.number().int();
export type IInteger = z.infer<typeof integerSchema>;

export class IntegerVO extends ValueObject<IInteger> {
  constructor(value: IInteger) {
    super({ value });
  }

  public get value(): IInteger {
    return this.props.value;
  }

  public static fromNumber(value: IInteger) {
    return new IntegerVO(value);
  }
}
