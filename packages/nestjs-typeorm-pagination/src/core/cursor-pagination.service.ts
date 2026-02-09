// @ts-nocheck
import {
  DataSource,
  EntityTarget,
  FindOptionsOrder,
  FindOptionsWhere,
  LessThan,
  MoreThan,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { CursorPaginationQueryDto } from "../dtos/cursor-pagination-query.dto";
import { PaginationConfig } from "../types";
import {
  CursorPaginationOptions,
  CursorPaginationResult,
} from "../types/cursor-pagination.types";
import { OrderBuilder } from "../builders/order.builder";

export class CursorPaginationService<TEntity extends ObjectLiteral> {
  private readonly repository: Repository<TEntity>;
  private readonly orderBuilder: OrderBuilder<TEntity>;

  constructor(
    private readonly dataSource: DataSource,
    private readonly entity: EntityTarget<TEntity>,
    private readonly config: PaginationConfig
  ) {
    this.repository = this.dataSource.getRepository(entity);
    this.orderBuilder = new OrderBuilder<TEntity>();
  }

  async paginateByCursor(
    query: CursorPaginationQueryDto,
    options: CursorPaginationOptions<TEntity> = {}
  ): Promise<CursorPaginationResult<TEntity>> {
    const {
      cursorField = "id" as keyof TEntity,
      allowedOrderBy,
      defaultOrderBy,
      defaultOrder = "ASC",
    } = options;

    const limit = this.normalizeLimit(query.limit);
    const order = this.orderBuilder.build(query.sort, {
      allowed: allowedOrderBy,
      default: defaultOrderBy,
      defaultDirection: defaultOrder,
    });

    const queryBuilder = this.createCursorQueryBuilder(
      query.cursor,
      query.direction,
      cursorField,
      order || ({ [cursorField]: defaultOrder } as FindOptionsOrder<TEntity>)
    );

    queryBuilder.take(limit + 1);

    const items = await queryBuilder.getMany();

    const hasMore = items.length > limit;
    const actualItems = hasMore ? items.slice(0, limit) : items;

    const hasNextPage =
      query.direction === "forward" ? hasMore : query.cursor !== undefined;
    const hasPreviousPage =
      query.direction === "backward" ? hasMore : query.cursor !== undefined;

    return {
      items: actualItems,
      meta: {
        hasNextPage,
        hasPreviousPage,
        startCursor: this.encodeCursor(actualItems[0], cursorField),
        endCursor: this.encodeCursor(
          actualItems[actualItems.length - 1],
          cursorField
        ),
        itemCount: actualItems.length,
      },
    };
  }

  async paginateQueryBuilderByCursor(
    queryBuilder: SelectQueryBuilder<TEntity>,
    query: CursorPaginationQueryDto,
    options: CursorPaginationOptions<TEntity> = {}
  ): Promise<CursorPaginationResult<TEntity>> {
    const { cursorField = "id" as keyof TEntity } = options;
    const limit = this.normalizeLimit(query.limit);

    if (query.cursor) {
      const decodedCursor = this.decodeCursor(query.cursor);
      const operator = query.direction === "forward" ? ">" : "<";
      queryBuilder.andWhere(`${String(cursorField)} ${operator} :cursor`, {
        cursor: decodedCursor,
      });
    }

    queryBuilder.take(limit + 1);

    const items = await queryBuilder.getMany();

    const hasMore = items.length > limit;
    const actualItems = hasMore ? items.slice(0, limit) : items;

    return {
      items: actualItems,
      meta: {
        hasNextPage: query.direction === "forward" ? hasMore : false,
        hasPreviousPage: query.direction === "backward" ? hasMore : false,
        startCursor: this.encodeCursor(actualItems[0], cursorField),
        endCursor: this.encodeCursor(
          actualItems[actualItems.length - 1],
          cursorField
        ),
        itemCount: actualItems.length,
      },
    };
  }

  private createCursorQueryBuilder(
    cursor: string | undefined,
    direction: "forward" | "backward",
    cursorField: keyof TEntity,
    order: FindOptionsOrder<TEntity>
  ): SelectQueryBuilder<TEntity> {
    const queryBuilder = this.repository.createQueryBuilder();

    if (cursor) {
      const decodedCursor = this.decodeCursor(cursor);
      const where: FindOptionsWhere<TEntity> = {
        [cursorField]:
          direction === "forward"
            ? MoreThan(decodedCursor)
            : LessThan(decodedCursor),
      } as FindOptionsWhere<TEntity>;

      queryBuilder.where(where);
    }

    Object.entries(order).forEach(([field, direction]) => {
      queryBuilder.addOrderBy(field, direction as "ASC" | "DESC");
    });

    return queryBuilder;
  }

  private encodeCursor(
    item: TEntity | undefined,
    field: keyof TEntity
  ): string | undefined {
    if (!item) return undefined;
    const value = item[field];
    return Buffer.from(String(value)).toString("base64");
  }

  private decodeCursor(cursor: string): string {
    return Buffer.from(cursor, "base64").toString("utf-8");
  }

  private normalizeLimit(requested?: number): number {
    const limit = requested ?? this.config.defaultLimit;
    return Math.min(Math.max(1, limit), this.config.maxLimit);
  }
}
