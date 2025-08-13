import {
  DataSource,
  EntityTarget,
  FindManyOptions,
  FindOptionsOrder,
  Repository,
} from "typeorm";
import { PaginationConfig, PaginationResult } from "../types";
import { PaginationQueryDto } from "../dtos/pagination-query.dto";

export class PaginationService<TEntity> {
  private readonly repository: Repository<TEntity>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly entity: EntityTarget<TEntity>,
    private readonly config: PaginationConfig
  ) {
    this.repository = this.dataSource.getRepository(this.entity);
  }

  async paginate(
    query: PaginationQueryDto = {},
    options: FindManyOptions<TEntity> = {}
  ): Promise<PaginationResult<TEntity>> {
    const page = Math.max(1, Number(query.page) || 1);
    const requestedLimit = Number(query.limit) || this.config.defaultLimit;
    const limit = Math.min(Math.max(1, requestedLimit), this.config.maxLimit);

    const hasOffset = query.offset !== undefined && query.offset !== null;
    const offset = hasOffset
      ? Math.max(0, Number(query.offset) || 0)
      : (page - 1) * limit;

    const order: FindOptionsOrder<TEntity> | undefined = this.buildOrder(query);

    const where = options.where ?? this.buildWhere(query);

    const [items, total] = await this.repository.findAndCount({
      ...options,
      where,
      skip: offset,
      take: limit,
      order: order as any,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = hasOffset ? Math.floor(offset / limit) + 1 : page;

    return {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages,
        currentPage,
      },
    };
  }

  private buildOrder(
    query: PaginationQueryDto
  ): FindOptionsOrder<TEntity> | undefined {
    if (!query.orderBy || !query.sortBy) return undefined;
    const direction =
      String(query.sortBy).toUpperCase() === "DESC" ? "DESC" : "ASC";
    return { [query.orderBy as keyof TEntity]: direction } as any;
  }

  private buildWhere(query: PaginationQueryDto): any | undefined {
    if (!query.filter || query.filter.length === 0) return undefined;

    const where: Record<string, any> = {};

    for (const raw of query.filter) {
      const [field, op, value] = String(raw).split(":");
      if (!field || !value) continue;
      const normalizedOp = (op || "eq").toLowerCase();

      switch (normalizedOp) {
        case "eq":
          where[field] = value;
          break;
        case "ne":
          where[field] = { $ne: value } as any;
          break;
        case "like":
          where[field] = { $like: `%${value}%` } as any;
          break;
        case "ilike":
          where[field] = { $ilike: `%${value}%` } as any;
          break;
        case "gt":
          where[field] = { $gt: value } as any;
          break;
        case "gte":
          where[field] = { $gte: value } as any;
          break;
        case "lt":
          where[field] = { $lt: value } as any;
          break;
        case "lte":
          where[field] = { $lte: value } as any;
          break;
        case "in":
          where[field] = { $in: value.split(",") } as any;
          break;
        default:
          where[field] = value;
      }
    }

    return where;
  }
}
