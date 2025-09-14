import { type ISpecVisitor } from "../specification";
import { BooleanEqual, BooleanNotEqual } from "./specifications/boolean.specification";
import {
  type DateBetween,
  type DateEqual,
  type DateGreaterThan,
  type DateGreaterThanOrEqual,
  type DateIsToday,
  type DateIsTomorrow,
  type DateIsYesterday,
  type DateLessThan,
  type DateLessThanOrEqual,
} from "./specifications/date.specification";
import {
  type NumberEmpty,
  type NumberEqual,
  type NumberGreaterThan,
  type NumberGreaterThanOrEqual,
  type NumberLessThan,
  type NumberLessThanOrEqual,
} from "./specifications/number.specification";
import {
  type StringContain,
  type StringEmpty,
  type StringEndsWith,
  type StringEqual,
  type StringNotEqual,
  type StringRegex,
  type StringStartsWith,
} from "./specifications/string.specification";

interface IFilterSpecBaseVisitor {
  idEqual(): void;
  idsIn(): void;
}

interface IFilterValueBaseVisitor {
  stringEqual(s: StringEqual): void;
  stringNotEqual(s: StringNotEqual): void;
  stringContain(s: StringContain): void;
  stringStartsWith(s: StringStartsWith): void;
  stringEndsWith(s: StringEndsWith): void;
  stringRegex(s: StringRegex): void;
  stringEmpty(s: StringEmpty): void;

  booleanEqual(s: BooleanEqual): void;
  booleanNotEqual(s: BooleanNotEqual): void;

  like(): void;

  numberEqual(s: NumberEqual): void;
  numberGreaterThan(s: NumberGreaterThan): void;
  numberLessThan(s: NumberLessThan): void;
  numberGreaterThanOrEqual(s: NumberGreaterThanOrEqual): void;
  numberLessThanOrEqual(s: NumberLessThanOrEqual): void;
  numberEmpty(s: NumberEmpty): void;

  dateEqual(s: DateEqual): void;
  dateGreaterThan(s: DateGreaterThan): void;
  dateLessThan(s: DateLessThan): void;
  dateGreaterThanOrEqual(s: DateGreaterThanOrEqual): void;
  dateLessThanOrEqual(s: DateLessThanOrEqual): void;
  dateIsToday(s: DateIsToday): void;
  dateIsTomorrow(s: DateIsTomorrow): void;
  dateIsYesterday(s: DateIsYesterday): void;
  dateBetween(s: DateBetween): void;

  dateRangeEqual(): void;
  dateRangeEmpty(): void;
  dateRangeDateEqual(): void;
  dateRangeDateGreaterThan(): void;
  dateRangeDateLessThan(): void;
  dateRangeDateGreaterThanOrEqual(): void;
  dateRangeDateLessThanOrEqual(): void;

  boolIsTrue(): void;
  boolIsFalse(): void;

  jsonEmpty(): void;
}

export type IFilterBaseVisitor = IFilterSpecBaseVisitor &
  IFilterValueBaseVisitor &
  ISpecVisitor;
