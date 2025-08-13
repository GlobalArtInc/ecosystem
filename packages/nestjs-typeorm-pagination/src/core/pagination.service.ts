import { Injectable } from "@nestjs/common";
import {
  PaginateConfig,
  PaginateSource,
  Paginated,
  PaginationQuery,
  SortParam,
} from "../types";
import {
  Brackets,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

@Injectable()
export class PaginationService {
  async paginate<T extends ObjectLiteral>(
    query: PaginationQuery,
    source: PaginateSource<T>,
    config: PaginateConfig<T> = {}
  ): Promise<Paginated<T>> {
    const alias = config.alias || "e";
    const qb = this.ensureQueryBuilder(source, alias);

    const hasOffset = typeof query.offset === "number" && query.offset >= 0;
    const page = hasOffset
      ? 1
      : Math.max(
          1,
          Number.isFinite(query.page || 0) ? (query.page as number) : 1
        );

    const defaultLimit = config.defaultLimit ?? 20;
    const maxLimit = config.maxLimit ?? 100;
    const rawLimit = Number.isFinite(query.limit || 0)
      ? (query.limit as number)
      : defaultLimit;
    const limit = Math.max(0, Math.min(rawLimit, maxLimit));

    if (config.withDeleted) {
      qb.withDeleted();
    }

    if (config.where) {
      qb.andWhere(new Brackets((b) => b.andWhere(config.where as any)));
    }

    const validSort = this.resolveSort(query.sort, config.sortable);
    for (const s of validSort) {
      const field = this.qualifyField(alias, s.field);
      qb.addOrderBy(field, s.direction.toUpperCase() as "ASC" | "DESC");
    }

    const searchFields = this.resolveSearchFields(
      query.searchBy,
      config.searchable
    );
    if (query.search && searchFields.length) {
      const term = `%${query.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          for (const field of searchFields) {
            const qf = this.qualifyField(alias, field);
            sub.orWhere(`LOWER(${qf}) LIKE LOWER(:__search)`, {
              __search: term,
            });
          }
        })
      );
    }

    if (query.filters && query.filters.length) {
      let idx = 0;
      for (const f of query.filters) {
        const field = this.qualifyField(alias, f.field);
        const p = `__f_${idx++}`;
        switch (f.operator) {
          case "eq":
            qb.andWhere(`${field} = :${p}`, { [p]: f.value });
            break;
          case "ne":
            qb.andWhere(`${field} <> :${p}`, { [p]: f.value });
            break;
          case "gt":
            qb.andWhere(`${field} > :${p}`, { [p]: f.value });
            break;
          case "gte":
            qb.andWhere(`${field} >= :${p}`, { [p]: f.value });
            break;
          case "lt":
            qb.andWhere(`${field} < :${p}`, { [p]: f.value });
            break;
          case "lte":
            qb.andWhere(`${field} <= :${p}`, { [p]: f.value });
            break;
          case "in": {
            const arr = (f.value || "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);
            qb.andWhere(`${field} IN (:...${p})`, { [p]: arr });
            break;
          }
          case "between": {
            const [from, to] = (f.value || "").split(",");
            qb.andWhere(`${field} BETWEEN :${p}_from AND :${p}_to`, {
              [`${p}_from`]: from,
              [`${p}_to`]: to,
            });
            break;
          }
          case "ilike":
            qb.andWhere(`LOWER(${field}) LIKE LOWER(:${p})`, {
              [p]: `%${f.value}%`,
            });
            break;
        }
      }
    }

    if (limit > 0) {
      const skip = hasOffset ? (query.offset as number) : (page - 1) * limit;
      qb.take(limit).skip(skip);
    }

    const [items, total] =
      limit > 0 ? await qb.getManyAndCount() : [await qb.getMany(), 0];

    const itemCount = items.length;
    const totalItems = limit > 0 ? total : itemCount;
    const totalPages =
      limit > 0 ? Math.max(1, Math.ceil(totalItems / limit)) : 1;

    return {
      data: items,
      meta: {
        totalItems,
        itemCount,
        itemsPerPage: limit > 0 ? limit : itemCount,
        totalPages,
        currentPage: hasOffset ? 1 : page,
      },
    };
  }

  private ensureQueryBuilder<T extends ObjectLiteral>(
    source: PaginateSource<T>,
    alias: string
  ): SelectQueryBuilder<T> {
    if (source instanceof SelectQueryBuilder) {
      return source as SelectQueryBuilder<T>;
    }
    if (source instanceof Repository) {
      return (source as Repository<T>).createQueryBuilder(alias);
    }
    const repo = source as unknown as Repository<T>;
    if (typeof (repo as any).createQueryBuilder === "function") {
      return (repo as any).createQueryBuilder(alias);
    }
    throw new Error("Unsupported paginate source");
  }

  private qualifyField(alias: string, field: string): string {
    if (!field) return field;
    if (field.includes(".") || field.includes("(") || field.includes(" ")) {
      return field;
    }
    return `${alias}.${field}`;
  }

  private resolveSort(
    sort: SortParam[] | undefined,
    allowed?: string[]
  ): SortParam[] {
    if (!sort || !sort.length) return [];
    if (!allowed || !allowed.length) return sort;
    const set = new Set(allowed);
    return sort.filter((s) => set.has(s.field));
  }

  private resolveSearchFields(
    searchBy: string[] | undefined,
    allowed?: string[]
  ): string[] {
    if (!allowed || !allowed.length) return [];
    if (!searchBy || !searchBy.length) return allowed;
    const set = new Set(allowed);
    return searchBy.filter((f) => set.has(f));
  }
}
