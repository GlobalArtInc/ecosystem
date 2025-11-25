import { FindOptionsOrder, ObjectLiteral } from "typeorm";

type SortDirection = "ASC" | "DESC";

interface OrderOptions<T> {
  allowed?: (keyof T)[];
  default?: keyof T;
  defaultDirection?: SortDirection;
}

export class OrderBuilder<TEntity extends ObjectLiteral> {
  build(
    sort?: string,
    options: OrderOptions<TEntity> = {}
  ): FindOptionsOrder<TEntity> | undefined {
    const { allowed, default: defaultField, defaultDirection = "ASC" } = options;

    if (!sort) {
      if (defaultField) {
        return { [defaultField]: defaultDirection } as FindOptionsOrder<TEntity>;
      }
      return undefined;
    }

    const { field, direction } = this.parseSort(sort);

    if (allowed && !allowed.includes(field as keyof TEntity)) {
      if (defaultField) {
        return { [defaultField]: defaultDirection } as FindOptionsOrder<TEntity>;
      }
      return undefined;
    }

    return { [field]: direction } as FindOptionsOrder<TEntity>;
  }

  private parseSort(sort: string): { field: string; direction: SortDirection } {
    if (sort.startsWith("-")) {
      return { field: sort.slice(1), direction: "DESC" };
    }

    if (sort.startsWith("+")) {
      return { field: sort.slice(1), direction: "ASC" };
    }

    const parts = sort.split(":");
    if (parts.length === 2) {
      const [field, dir] = parts;
      const direction = dir.toUpperCase() === "DESC" ? "DESC" : "ASC";
      return { field, direction };
    }

    return { field: sort, direction: "ASC" };
  }
}

