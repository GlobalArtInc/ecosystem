import z from "zod";
import { ValueObject } from "./value-object.js";

export const dateSchema = z.date();
export type IDate = z.infer<typeof dateSchema>;

export class DateVO extends ValueObject<IDate> {
  constructor(value: IDate) {
    super({ value });
  }

  public get value(): Date {
    return this.props.value;
  }

  public static fromDate(value: Date) {
    return new DateVO(value);
  }

  public static now(): DateVO {
    return new DateVO(new Date());
  }
}
