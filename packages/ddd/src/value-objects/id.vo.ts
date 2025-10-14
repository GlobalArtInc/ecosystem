import { ValueObject, ValueObjectProps } from "./value-object";

export abstract class ID<T = any> extends ValueObject<T> {
  constructor(value: T) {
    super({ value } as ValueObjectProps<T>);
  }

  public get value(): T {
    return this.unpack();
  }
}
