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

  private buildWhere(query: PaginationQueryDto) {
    const filter = (query as { "filter[]": string[] })["filter[]"];
    const filters = typeof filter === "string" ? [filter] : filter;

    if (filters.length === 0) return undefined;
    const conditions: Array<Record<string, any>> = [];
    for (const raw of filters) {
      const [field, operator, value] = String(raw).split("||");

      if (!field || !operator || !value) continue;

      const normalizedOperator = operator.replace(/^\$/, "").toLowerCase();
      let condition: any;

      switch (normalizedOperator) {
        case "eq":
          condition = value;
          break;
        case "ne":
          condition = Not(value);
          break;
        case "like":
          condition = Like(`%${value}%`);
          break;
        case "ilike":
          condition = ILike(`%${value}%`);
          break;
        case "gt":
          condition = MoreThan(value);
          break;
        case "gte":
          condition = MoreThanOrEqual(value);
          break;
        case "lt":
          condition = LessThan(value);
          break;
        case "lte":
          condition = LessThanOrEqual(value);
          break;
        case "in":
          condition = In(String(value).split(","));
          break;
        default:
          condition = value;
      }

      conditions.push({ [field]: condition });
    }

    if (conditions.length === 0) {
      return undefined;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return conditions;
  }
}
