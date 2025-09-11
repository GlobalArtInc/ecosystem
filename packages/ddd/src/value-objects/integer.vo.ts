import { ValueObject } from './value-object.js';

export class IntegerVO extends ValueObject<number> {
  constructor(value: number) {
    super({ value });
  }

  public get value(): number {
    return this.props.value;
  }

  public static fromNumber(value: number) {
    return new IntegerVO(value);
  }
}
