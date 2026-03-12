import z from "zod";
import { ValueObject } from "./value-object.js";

const colorSchema = z.hex();
export type IColor = z.infer<typeof colorSchema>;

export class ColorVO extends ValueObject<IColor> {
  constructor(value: IColor) {
    super({ value });
  }

  static create(value: IColor) {
    return new this(colorSchema.parse(value));
  }

  public get value(): IColor {
    return this.props.value;
  }
}
