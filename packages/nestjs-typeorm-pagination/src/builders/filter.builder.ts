import {
  ILike,
  In,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
  Between,
  FindOptionsWhere,
  ObjectLiteral,
} from "typeorm";

interface FilterInput {
  field: string;
  operator: string;
  value: string | number | string[];
}

interface FilterOptions<T> {
  allowed?: (keyof T)[];
}

export class FilterBuilder<TEntity extends ObjectLiteral> {
  private readonly operators = {
    eq: (v: string | number) => v,
    ne: (v: string | number) => Not(v),
    gt: (v: string | number) => MoreThan(v),
    gte: (v: string | number) => MoreThanOrEqual(v),
    lt: (v: string | number) => LessThan(v),
    lte: (v: string | number) => LessThanOrEqual(v),
    like: (v: string) => Like(`%${v}%`),
    ilike: (v: string) => ILike(`%${v}%`),
    in: (v: string | string[]) => In(Array.isArray(v) ? v : v.split(",")),
    between: (v: string) => {
      const [from, to] = v.split(",");
      return Between(from, to);
    },
  } as const;

  build(
    filters?: FilterInput[],
    options: FilterOptions<TEntity> = {}
  ): FindOptionsWhere<TEntity> | undefined {
    if (!filters?.length) return undefined;

    const conditions: FindOptionsWhere<TEntity>[] = [];

    for (const filter of filters) {
      if (
        options.allowed &&
        !options.allowed.includes(filter.field as keyof TEntity)
      ) {
        continue;
      }

      const operatorFn =
        this.operators[filter.operator as keyof typeof this.operators];
      if (!operatorFn) continue;

      conditions.push({
        [filter.field]: operatorFn(filter.value as string),
      } as FindOptionsWhere<TEntity>);
    }

    return conditions.length === 1
      ? conditions[0]
      : (conditions as unknown as FindOptionsWhere<TEntity>);
  }
}
