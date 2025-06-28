import { Ok, type Result } from "oxide.ts";
import { BooleanFieldValue } from "../fields/boolean/boolean-field-value";
import { type IFilterBaseVisitor } from "../filter-specification-visitor.base";
import { BaseFilterSpecification } from "../filter-specification.base";

export class BooleanEqual extends BaseFilterSpecification<
  unknown,
  BooleanFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    return value instanceof BooleanFieldValue && this.value.equals(value);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.booleanEqual(this);

    return Ok(undefined);
  }
}

export class BooleanNotEqual extends BaseFilterSpecification<
  unknown,
  BooleanFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    return value instanceof BooleanFieldValue && this.value.equals(value);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.booleanNotEqual(this);

    return Ok(undefined);
  }
}

