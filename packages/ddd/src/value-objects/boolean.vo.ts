import { ValueObject } from './value-object.js';

export class BoolVO extends ValueObject<boolean> {
  constructor(value: boolean) {
    super({ value });
  }

  public get value(): boolean {
    return this.props.value;
  }

  public static True(): BoolVO {
    return new BoolVO(true);
  }

  public static False(): BoolVO {
    return new BoolVO(false);
  }
}
