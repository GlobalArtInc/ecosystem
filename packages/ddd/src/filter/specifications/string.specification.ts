import { Ok, type Result } from "oxide.ts";
import { StringFieldValue } from "../fields/string/string-field-value";
import { type IFilterBaseVisitor } from "../filter-specification-visitor.base";
import { BaseFilterSpecification } from "../filter-specification.base";

export class StringEqual extends BaseFilterSpecification<
  unknown,
  StringFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    return value instanceof StringFieldValue && this.value.equals(value);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.stringEqual(this);

    return Ok(undefined);
  }
}

export class StringNotEqual extends BaseFilterSpecification<
  unknown,
  StringFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    return value instanceof StringFieldValue && this.value.equals(value);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.stringNotEqual(this);

    return Ok(undefined);
  }
}

export class StringContain extends BaseFilterSpecification<
  unknown,
  StringFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof StringFieldValue)) {
      return false;
    }

    const s1 = value.unpack();
    const s2 = this.value.unpack();

    return !!s1 && !!s2 && s1.includes(s2);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.stringContain(this);

    return Ok(undefined);
  }
}

export class StringStartsWith extends BaseFilterSpecification<
  unknown,
  StringFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof StringFieldValue)) {
      return false;
    }

    const s1 = value.unpack();
    const s2 = this.value.unpack();

    return !!s1 && !!s2 && s1.startsWith(s2);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.stringStartsWith(this);

    return Ok(undefined);
  }
}

export class StringEndsWith extends BaseFilterSpecification<
  unknown,
  StringFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof StringFieldValue)) {
      return false;
    }

    const s1 = value.unpack();
    const s2 = this.value.unpack();

    return !!s1 && !!s2 && s1.endsWith(s2);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.stringEndsWith(this);

    return Ok(undefined);
  }
}

export class StringRegex extends BaseFilterSpecification<
  unknown,
  StringFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof StringFieldValue)) {
      return false;
    }

    const s1 = value.unpack();
    const s2 = this.value.unpack();

    return !!s1 && !!s2 && new RegExp(s2).test(s1);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.stringRegex(this);

    return Ok(undefined);
  }
}

export class StringEmpty extends BaseFilterSpecification<
  unknown,
  StringFieldValue
> {
  constructor(field: string) {
    super(field, new StringFieldValue(null));
  }

  isSatisfiedBy(value: unknown): boolean {
    if (value instanceof StringFieldValue) {
      return !value.unpack();
    }

    return !value;
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.stringEmpty(this);

    return Ok(undefined);
  }
}
