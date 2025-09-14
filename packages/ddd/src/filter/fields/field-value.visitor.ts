import { type BooleanFieldValue } from "./boolean";
import { type DateFieldValue } from "./date/date-field-value";
import { type NumberFieldValue } from "./number/number-field-value";
import { type StringFieldValue } from "./string/string-field-value";

export interface IFieldValueVisitor {
  number(value: NumberFieldValue): void;
  string(value: StringFieldValue): void;
  date(value: DateFieldValue): void;
  boolean(value: BooleanFieldValue): void;
}
