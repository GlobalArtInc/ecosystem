import {
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from "typeorm";

export type SortParam = { field: string; direction: "asc" | "desc" };

export type FilterOperator =
  | "eq"
  | "ne"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "between"
  | "ilike";

export type FilterParam = {
  field: string;
  operator: FilterOperator;
  value?: string;
};

export type PaginationQuery = {
  page?: number;
  limit?: number;
  offset?: number;
  sort?: SortParam[];
  search?: string;
  searchBy?: string[];
  select?: string[];
  filters?: FilterParam[];
  path: string;
};

export type PaginateSource<T extends ObjectLiteral> =
  | Repository<T>
  | SelectQueryBuilder<T>;

export type PaginateConfig<T extends ObjectLiteral> = {
  sortable?: string[];
  searchable?: string[];
  filterable?: string[];
  defaultLimit?: number;
  maxLimit?: number;
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  withDeleted?: boolean;
  alias?: string;
};

export type PaginatedMeta = {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PaginatedMeta;
};
