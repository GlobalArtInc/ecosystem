// @ts-nocheck
import { Injectable } from "@nestjs/common";
import {
  DataSource,
  EntityTarget,
  FindManyOptions,
  FindOptionsOrder,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { PaginationQueryDto } from "../dtos/pagination-query.dto";
import {
  PaginationConfig,
  PaginationOptions,
  PaginationResult,
} from "../types";
import { FilterBuilder } from "../builders/filter.builder";
import { OrderBuilder } from "../builders/order.builder";

export class PaginationService<TEntity extends ObjectLiteral> {
  private readonly repository: Repository<TEntity>;
  private readonly filterBuilder: FilterBuilder<TEntity>;
  private readonly orderBuilder: OrderBuilder<TEntity>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly entity: EntityTarget<TEntity>,
    private readonly config: PaginationConfig
  ) {
    this.repository = this.dataSource.getRepository(entity);
    this.filterBuilder = new FilterBuilder<TEntity>();
    this.orderBuilder = new OrderBuilder<TEntity>();
  }

  async paginate(
    query: PaginationQueryDto,
    options: PaginationOptions<TEntity> = {},
    findOptions: FindManyOptions<TEntity> = {}
  ): Promise<PaginationResult<TEntity>> {
    const limit = this.normalizeLimit(query.limit);
    const offset = Math.max(0, query.offset ?? 0);

    const order = this.orderBuilder.build(query.sort, {
      allowed: options.allowedOrderBy,
      default: options.defaultOrderBy,
      defaultDirection: options.defaultOrder,
    });

    const where =
      findOptions.where ??
      this.filterBuilder.build(query.filters, {
        allowed: options.allowedFilters,
      });

    const [items, total] = await this.repository.findAndCount({
      ...findOptions,
      where,
      skip: offset,
      take: limit,
      order,
    });

    return this.buildResult(items, total, limit, offset);
  }

  async paginateQueryBuilder(
    queryBuilder: SelectQueryBuilder<TEntity>,
    query: PaginationQueryDto
  ): Promise<PaginationResult<TEntity>> {
    const limit = this.normalizeLimit(query.limit);
    const offset = Math.max(0, query.offset ?? 0);

    const [items, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return this.buildResult(items, total, limit, offset);
  }

  private normalizeLimit(requested?: number): number {
    const limit = requested ?? this.config.defaultLimit;
    return Math.min(Math.max(1, limit), this.config.maxLimit);
  }

  private buildResult(
    items: TEntity[],
    total: number,
    limit: number,
    offset: number
  ): PaginationResult<TEntity> {
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
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1,
      },
    };
  }
}
