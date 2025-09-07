import { ValueObject } from './value-object.js';

export class StringVO extends ValueObject<string> {
  constructor(value: string) {
    super({ value });
  }

  public get value(): string {
    return this.props.value;
  }

  public static empty(): StringVO {
    return new StringVO('');
  }
}
