import { IPagination } from "./pagination";
import { type ISorting } from "./sort";

export interface IRepositoryOption {
  pagination?: IPagination;
  sorting?: ISorting;
}

export interface PaginatedRepositoryMethodResult<T extends unknown> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
