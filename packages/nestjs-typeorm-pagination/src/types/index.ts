export * from "./cursor-pagination.types";

export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
}

export interface PaginationModuleOptions extends Partial<PaginationConfig> {}

export interface PaginationOptions<TEntity> {
  allowedFilters?: (keyof TEntity)[];
  allowedOrderBy?: (keyof TEntity)[];
  defaultOrderBy?: keyof TEntity;
  defaultOrder?: "ASC" | "DESC";
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationResult<T> {
  items: T[];
  meta: PaginationMeta;
}
