import {
  isAfter,
  isBefore,
  isEqual,
  isToday,
  isTomorrow,
  isWithinInterval,
  isYesterday,
} from "date-fns";
import { Ok, type Result } from "@globalart/oxide";
import { DateFieldValue } from "../fields/date/date-field-value";
import { type IFilterBaseVisitor } from "../filter-specification-visitor.base";
import { BaseFilterSpecification } from "../filter-specification.base";

export class DateEqual extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    return value instanceof DateFieldValue && value.equals(this.value);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateEqual(this);

    return Ok(undefined);
  }
}

export class DateGreaterThan extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof DateFieldValue)) {
      return false;
    }
    const d1 = value.unpack();
    const d2 = this.value.unpack();

    return !!d1 && !!d2 && isAfter(d1, d2);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateGreaterThan(this);

    return Ok(undefined);
  }
}

export class DateLessThan extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof DateFieldValue)) {
      return false;
    }

    const d1 = value.unpack();
    const d2 = this.value.unpack();

    return !!d1 && !!d2 && isBefore(d1, d2);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateLessThan(this);

    return Ok(undefined);
  }
}

export class DateGreaterThanOrEqual extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof DateFieldValue)) {
      return false;
    }

    const d1 = value.unpack();
    const d2 = this.value.unpack();

    return !!d1 && !!d2 && (isEqual(d1, d2) || isAfter(d1, d2));
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateGreaterThanOrEqual(this);

    return Ok(undefined);
  }
}

export class DateLessThanOrEqual extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof DateFieldValue)) {
      return false;
    }

    const d1 = value.unpack();
    const d2 = this.value.unpack();

    return !!d1 && !!d2 && (isEqual(d1, d2) || isBefore(d1, d2));
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateLessThanOrEqual(this);

    return Ok(undefined);
  }
}

export class DateIsToday extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof DateFieldValue)) {
      return false;
    }

    const date = value.unpack();

    return !!date && isToday(date);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateIsToday(this);

    return Ok(undefined);
  }
}

export class DateIsTomorrow extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof DateFieldValue)) {
      return false;
    }

    const date = value.unpack();

    return !!date && isTomorrow(date);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateIsTomorrow(this);

    return Ok(undefined);
  }
}

export class DateIsYesterday extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof DateFieldValue)) {
      return false;
    }

    const date = value.unpack();

    return !!date && isYesterday(date);
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateIsYesterday(this);

    return Ok(undefined);
  }
}

export class DateBetween extends BaseFilterSpecification<
  unknown,
  DateFieldValue
> {
  constructor(
    public field: string,
    public dateStart: Date,
    public dateEnd: Date,
    public relation?: string
  ) {
    super(field, new DateFieldValue(dateStart), relation);
  }

  isSatisfiedBy(value: unknown): boolean {
    if (!(value instanceof DateFieldValue)) {
      return false;
    }

    const date = value.unpack();

    return (
      !!date &&
      isWithinInterval(date, { start: this.dateStart, end: this.dateEnd })
    );
  }

  accept(v: IFilterBaseVisitor): Result<void, string> {
    v.dateBetween(this);

    return Ok(undefined);
  }
}
