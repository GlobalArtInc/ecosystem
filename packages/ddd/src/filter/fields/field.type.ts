import { type IDateFieldValue } from './date/date-field.type';
import { type INumberFieldValue } from './number/number-field.type';
import { type IStringFieldValue } from './string/string-field.type';

export type UnpackedFieldValue = IStringFieldValue | INumberFieldValue | IDateFieldValue;
