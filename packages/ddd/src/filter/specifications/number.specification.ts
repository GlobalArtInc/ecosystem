import { Ok, type Result } from "@globalart/oxide";
import { type IFilterBaseVisitor } from "../filter-specification-visitor.base";
import { BaseFilterSpecification } from "../filter-specification.base";
import { NumberFieldValue } from "../fields/number/number-field-value";

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export class NumberEqual extends BaseFilterSpecification<
  unknown,
  NumberFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    return value instanceof NumberFieldValue && value.equals(this.value);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.numberEqual(this);

    return Ok(undefined);
  }
}

export class NumberGreaterThan extends BaseFilterSpecification<
  unknown,
  NumberFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof NumberFieldValue)) {
      return false;
    }
    const n1 = value.unpack();
    const n2 = this.value.unpack();
    if (n1 === null && isNumber(n2)) {
      return true;
    }

    return n1 !== null && n2 !== null && n1 > n2;
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.numberGreaterThan(this);

    return Ok(undefined);
  }
}

export class NumberLessThan extends BaseFilterSpecification<
  unknown,
  NumberFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof NumberFieldValue)) {
      return false;
    }
    const n1 = value.unpack();
    const n2 = this.value.unpack();

    return n1 !== null && n2 !== null && n1 < n2;
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.numberLessThan(this);

    return Ok(undefined);
  }
}

export class NumberGreaterThanOrEqual extends BaseFilterSpecification<
  unknown,
  NumberFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof NumberFieldValue)) {
      return false;
    }
    const n1 = value.unpack();
    const n2 = this.value.unpack();
    if (n1 === null && isNumber(n2)) {
      return true;
    }

    return n1 !== null && n2 !== null && n1 >= n2;
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.numberGreaterThanOrEqual(this);

    return Ok(undefined);
  }
}

export class NumberLessThanOrEqual extends BaseFilterSpecification<
  unknown,
  NumberFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof NumberFieldValue)) {
      return false;
    }
    const n1 = value.unpack();
    const n2 = this.value.unpack();

    return n1 !== null && n2 !== null && n1 <= n2;
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.numberLessThanOrEqual(this);

    return Ok(undefined);
  }
}

export class NumberEmpty extends BaseFilterSpecification<
  unknown,
  NumberFieldValue
> {
  constructor(public readonly field: string) {
    super(field, new NumberFieldValue(null));
  }

  isSatisfiedBy(value: unknown): boolean {
    return value instanceof NumberFieldValue && isNil(value.unpack());
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.numberEmpty(this);

    return Ok(undefined);
  }
}
