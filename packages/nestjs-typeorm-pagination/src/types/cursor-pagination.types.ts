export interface CursorPaginationMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
  itemCount: number;
}

export interface CursorPaginationResult<T> {
  items: T[];
  meta: CursorPaginationMeta;
}

export interface CursorPaginationOptions<TEntity> {
  cursorField?: keyof TEntity;
  allowedOrderBy?: (keyof TEntity)[];
  defaultOrderBy?: keyof TEntity;
  defaultOrder?: "ASC" | "DESC";
}

