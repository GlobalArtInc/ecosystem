import { ValueObject } from "./value-object.js";
import z from "zod";

export const booleanSchema = z.boolean();
export type IBoolean = z.infer<typeof booleanSchema>;

export class BoolVO extends ValueObject<IBoolean> {
  constructor(value: IBoolean) {
    super({ value });
  }

  public get value(): IBoolean {
    return this.props.value;
  }

  public static fromBoolean(value: IBoolean) {
    return new BoolVO(value);
  }

  public static True(): BoolVO {
    return new BoolVO(true);
  }

  public static False(): BoolVO {
    return new BoolVO(false);
  }
}
