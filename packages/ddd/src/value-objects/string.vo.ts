import z from "zod";
import { ValueObject } from "./value-object.js";

export const stringSchema = z.string().trim().min(1);
export type IString = z.infer<typeof stringSchema>;

export class StringVO extends ValueObject<IString> {
  constructor(value: IString) {
    super({ value });
  }

  public get value(): IString {
    return this.props.value;
  }

  public static fromString(value: IString) {
    return new StringVO(value);
  }

  public static empty(): StringVO {
    return new StringVO("");
  }
}
