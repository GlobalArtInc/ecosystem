import z from "zod";
import { ValueObject, ValueObjectProps } from "./value-object";

export const idSchema = z.any();
export type IId = z.infer<typeof idSchema>;

export abstract class ID<T = IId> extends ValueObject<T> {
  constructor(value: T) {
    super({ value } as ValueObjectProps<T>);
  }

  public get value(): T {
    return this.unpack();
  }
}
