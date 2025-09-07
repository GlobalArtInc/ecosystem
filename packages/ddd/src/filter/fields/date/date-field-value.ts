import { FieldValueBase } from '../field-value.base';
import { type IFieldValueVisitor } from '../field-value.visitor';
import { type IDateFieldValue } from './date-field.type';

export class DateFieldValue extends FieldValueBase<IDateFieldValue> {
  constructor(value: IDateFieldValue) {
    super({ value });
  }

  accept(visitor: IFieldValueVisitor): void {
    visitor.date(this);
  }

  static fromNullableString(str: string | null): DateFieldValue {
    if (!str) {
      return new this(null);
    }

    return new this(new Date(str));
  }
}
