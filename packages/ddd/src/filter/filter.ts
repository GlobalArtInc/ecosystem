import { isEmpty } from "lodash";
import { None, Some, type Option } from "oxide.ts";
import { match } from "ts-pattern";
import { z } from "zod";
import { conjunctions, type IConjunction } from "./conjunction";
import { DateFieldValue } from "./fields/date/date-field-value";
import { dateFilter, type IDateFilter } from "./fields/date/date.filter";
import { NumberFieldValue } from "./fields/number/number-field-value";
import {
  numberFilter,
  numberFilterOperators,
  type INumberFilter,
} from "./fields/number/number.filter";
import { StringFieldValue } from "./fields/string/string-field-value";
import {
  stringFilter,
  stringFilterOperators,
  type IStringFilter,
} from "./fields/string/string.filter";
import { type BaseFilterSpecification } from "./filter-specification.base";
import { DateBetween, DateEqual } from "./specifications/date.specification";
import {
  NumberEmpty,
  NumberEqual,
  NumberGreaterThan,
  NumberGreaterThanOrEqual,
  NumberLessThan,
  NumberLessThanOrEqual,
} from "./specifications/number.specification";
import {
  StringContain,
  StringEmpty,
  StringEndsWith,
  StringEqual,
  StringNotEqual,
  StringRegex,
  StringStartsWith,
} from "./specifications/string.specification";

export const filterRoorFilter = <T extends z.ZodType>(filters: [T, ...T[]]) => {
  const filterTuple: [T, ...T[]] = [filters[0], ...filters.slice(1)];

  const filter = z.union(filterTuple as [T, T, ...T[]]);

  const group: z.ZodType<{
    conjunction?: IConjunction;
    children?: (z.infer<typeof group> | z.infer<typeof filter>)[];
  }> = z.lazy(() =>
    z.object({
      conjunction: conjunctions,
      children: z.union([group, filter]).array().nonempty().optional(),
    }),
  );

  const filterOrGroup = filter.or(group);
  type IFilterOrGroup = z.infer<typeof filterOrGroup>;
  const filterOrGroupList = filterOrGroup.array();

  return group.or(filterOrGroupList);
};

const filter = z.discriminatedUnion("type", [
  numberFilter,
  stringFilter,
  dateFilter,
]);

export type IFilter = z.infer<typeof filter>;
export type IFilters = IFilter[];

export interface IGroup<Filter extends IFilter = IFilter> {
  conjunction?: IConjunction;
  children?: IFilterOrGroupList<Filter>;
}

const group: z.ZodType<IGroup> = z.lazy(() =>
  z.object({
    conjunction: conjunctions,
    children: z.union([group, filter]).array().nonempty().optional(),
  }),
);

const filterOrGroup = filter.or(group);
export type IFilterOrGroup<Filter extends IFilter = IFilter> =
  | Filter
  | IGroup<Filter>;

export const filterOrGroupList = filterOrGroup.array();
export type IFilterOrGroupList<Filter extends IFilter = IFilter> =
  IFilterOrGroup<Filter>[];
export const rootFilter = filterOrGroup.or(filterOrGroupList);
export type IRootFilter<Filter extends IFilter = IFilter> =
  | IFilterOrGroup<Filter>
  | IFilterOrGroupList<Filter>;

export const isGroup = (
  filterOrGroup: IFilterOrGroup,
): filterOrGroup is IGroup => {
  return Reflect.has(filterOrGroup, "conjunction");
};

export const isFilter = (
  filterOrGroup: IFilterOrGroup,
): filterOrGroup is IFilter => {
  return (
    Reflect.has(filterOrGroup, "type") && Reflect.has(filterOrGroup, "operator")
  );
};

export const operators = z.union([
  numberFilterOperators,
  stringFilterOperators,
]);
export type IOperator = z.infer<typeof operators>;

type IFieldType = "number";

export const operatorsMap: Record<IFieldType, IOperator[]> = {
  number: numberFilterOperators.options.map((v) => v.value),
};

const convertStringFilter = (
  filter: IStringFilter,
): Option<BaseFilterSpecification> => {
  if (filter.value === undefined) {
    return None;
  }

  switch (filter.operator) {
    case "$eq": {
      return Some(
        new StringEqual(
          filter.field,
          new StringFieldValue(filter.value),
          filter.relation,
        ),
      );
    }
    case "$neq": {
      return Some(
        new StringNotEqual(
          filter.field,
          new StringFieldValue(filter.value),
          filter.relation,
        ),
      );
    }
    case "$contains": {
      return Some(
        new StringContain(filter.field, new StringFieldValue(filter.value)),
      );
    }
    case "$not_contains": {
      return Some(
        new StringContain(
          filter.field,
          new StringFieldValue(filter.value),
        ).not() as unknown as BaseFilterSpecification,
      );
    }
    case "$starts_with": {
      return Some(
        new StringStartsWith(filter.field, new StringFieldValue(filter.value)),
      );
    }
    case "$ends_with": {
      return Some(
        new StringEndsWith(filter.field, new StringFieldValue(filter.value)),
      );
    }
    case "$regex": {
      return Some(
        new StringRegex(filter.field, new StringFieldValue(filter.value)),
      );
    }
    case "$is_empty": {
      return Some(new StringEmpty(filter.field));
    }
    case "$is_not_empty": {
      return Some(
        new StringEmpty(
          filter.field,
        ).not() as unknown as BaseFilterSpecification,
      );
    }

    default:
      return None;
  }
};

const convertNumberFilter = (
  filter: INumberFilter,
): Option<BaseFilterSpecification> => {
  if (filter === undefined) {
    return None;
  }

  switch (filter.operator) {
    case "$eq":
      return Some(
        new NumberEqual(filter.field, new NumberFieldValue(filter.value)),
      );
    case "$neq": {
      // @ts-ignore
      return Some(
        new NumberEqual(filter.field, new NumberFieldValue(filter.value)).not(),
      );
    }
    case "$gt": {
      return Some(
        new NumberGreaterThan(filter.field, new NumberFieldValue(filter.value)),
      );
    }
    case "$gte": {
      return Some(
        new NumberGreaterThanOrEqual(
          filter.field,
          new NumberFieldValue(filter.value),
        ),
      );
    }
    case "$lt": {
      return Some(
        new NumberLessThan(filter.field, new NumberFieldValue(filter.value)),
      );
    }
    case "$lte": {
      return Some(
        new NumberLessThanOrEqual(
          filter.field,
          new NumberFieldValue(filter.value),
        ),
      );
    }
    case "$is_empty": {
      return Some(new NumberEmpty(filter.field));
    }
    case "$is_not_empty": {
      // @ts-ignore
      return Some(new NumberEmpty(filter.field).not());
    }
    default:
      return None;
  }
};

const convertDateFilter = (
  filter: IDateFilter,
): Option<BaseFilterSpecification> => {
  if (filter === undefined) {
    return None;
  }

  switch (filter.operator) {
    case "$eq": {
      return Some(
        new DateEqual(
          filter.field,
          DateFieldValue.fromNullableString(filter.value as string),
          filter.relation,
        ),
      );
    }
    case "$between": {
      return Some(
        new DateBetween(
          filter.field,
          new Date((filter.value as [string, string])[0]),
          new Date((filter.value as [string, string])[1]),
        ),
      );
    }
  }
};

const convertFilter = (filter: IFilter): Option<BaseFilterSpecification> => {
  return match(filter)
    .returnType<Option<BaseFilterSpecification>>()
    .with({ type: "number" }, (f) => convertNumberFilter(f))
    .with({ type: "string" }, (f) => convertStringFilter(f))
    .with({ type: "date" }, (f) => convertDateFilter(f))
    .otherwise(() => None);
};

const convertFilterOrGroup = (
  filterOrGroup: IFilterOrGroup,
): Option<BaseFilterSpecification> => {
  if (isGroup(filterOrGroup)) {
    return convertFilterOrGroupList(
      filterOrGroup.children,
      filterOrGroup.conjunction,
    );
  } else if (isFilter(filterOrGroup)) {
    return convertFilter(filterOrGroup);
  }

  return None;
};

const convertFilterOrGroupList = (
  filterOrGroupList: IFilterOrGroupList = [],
  conjunction: IConjunction = "$and",
): Option<BaseFilterSpecification> => {
  let spec: Option<BaseFilterSpecification> = None;
  for (const filter of filterOrGroupList) {
    if (spec.isNone()) {
      spec = convertFilterOrGroup(filter);
      if (conjunction === "$not") {
        // @ts-ignore
        return spec.map((s) => s.not());
      }
    } else {
      if (isFilter(filter)) {
        // @ts-ignore
        spec = spec.map((left) => {
          const right = convertFilterOrGroup(filter);
          if (right.isSome()) {
            if (conjunction === "$and") {
              return left.and(right.unwrap());
            } else if (conjunction === "$or") {
              return left.or(right.unwrap());
            }

            return left.and(right.unwrap().not());
          }

          return left;
        });
      } else if (isGroup(filter)) {
        spec = convertFilterOrGroupList(filter.children, filter.conjunction);
      }
    }
  }

  return spec;
};

export const convertFilterSpec = (
  filter: IRootFilter,
): Option<BaseFilterSpecification> => {
  if (Array.isArray(filter)) {
    return convertFilterOrGroupList(filter);
  }

  return convertFilterOrGroup(filter);
};

export const isEmptyFilter = (filter: IRootFilter) => isEmpty(filter);
