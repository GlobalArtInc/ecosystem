export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
}

export interface PaginationModuleOptions extends Partial<PaginationConfig> {}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginationResult<T> {
  items: T[];
  meta: PaginationMeta;
}
