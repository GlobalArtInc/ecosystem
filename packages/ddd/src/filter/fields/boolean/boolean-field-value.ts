import { FieldValueBase } from "../field-value.base";
import { type IFieldValueVisitor } from "../field-value.visitor";
import { type IBooleanFieldValue } from "./boolean-field.type";
  
export class BooleanFieldValue extends FieldValueBase<IBooleanFieldValue> {
  constructor(value: IBooleanFieldValue) {
    super({ value });
  }

  accept(visitor: IFieldValueVisitor): void {
    visitor.boolean(this);
  }
}
