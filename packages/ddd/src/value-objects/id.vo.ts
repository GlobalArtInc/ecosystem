import { ValueObject } from './value-object';

export abstract class ID extends ValueObject<number> {
  constructor(value: number) {
    super({ value });
  }

  public get value(): number {
    return this.props.value;
  }
}
