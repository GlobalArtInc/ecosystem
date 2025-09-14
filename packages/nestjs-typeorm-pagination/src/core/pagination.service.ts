import {
  DataSource,
  EntityTarget,
  FindManyOptions,
  FindOptionsOrder,
  ILike,
  In,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  MoreThanOrEqual,
  Not,
  ObjectLiteral,
  Repository,
} from "typeorm";
import { PaginationQueryDto } from "../dtos/pagination-query.dto";
import { PaginationConfig, PaginationResult } from "../types";

export class PaginationService<TEntity extends ObjectLiteral> {
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
    const requestedLimit = Number(query.limit) || this.config.defaultLimit;
    const limit = Math.min(Math.max(1, requestedLimit), this.config.maxLimit);

    const offset = Math.max(0, Number(query.offset) || 0);

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
    const currentPage = Math.floor(offset / limit) + 1;

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
      const [field, op, value] = String(raw).split("||");
      if (!field || value === undefined) continue;
      const normalizedOp = (op || "eq").toLowerCase();

      switch (normalizedOp) {
        case "eq":
          where[field] = value;
          break;
        case "ne":
          where[field] = Not(value as any);
          break;
        case "like":
          where[field] = Like(`%${value}%`);
          break;
        case "ilike":
          where[field] = ILike(`%${value}%` as any);
          break;
        case "gt":
          where[field] = MoreThan(value as any);
          break;
        case "gte":
          where[field] = MoreThanOrEqual(value as any);
          break;
        case "lt":
          where[field] = LessThan(value as any);
          break;
        case "lte":
          where[field] = LessThanOrEqual(value as any);
          break;
        case "in":
          where[field] = In(String(value).split(",") as any[]);
          break;
        default:
          where[field] = value;
      }
    }

    return where;
  }
}
