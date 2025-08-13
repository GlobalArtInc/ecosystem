import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request as ExpressRequest } from "express";
import type { FastifyRequest } from "fastify";
import { PaginationQuery, SortParam, FilterParam } from "../types";

function isRecord(data: unknown): data is Record<string, unknown> {
  return data !== null && typeof data === "object" && !Array.isArray(data);
}

function isExpressRequest(request: unknown): request is ExpressRequest {
  return isRecord(request) && typeof (request as any).get === "function";
}

function parseSort(
  input: unknown,
  orderBy?: unknown,
  sortBy?: unknown
): SortParam[] | undefined {
  const result: SortParam[] = [];

  // orderBy + sortBy из примера
  if (orderBy) {
    const field = String(orderBy).trim();
    const dir = String(sortBy || "asc").toLowerCase();
    if (field && (dir === "asc" || dir === "desc")) {
      result.push({ field, direction: dir as "asc" | "desc" });
    }
  }

  // общий формат sort/sortBy как раньше
  const values: string[] = Array.isArray(input)
    ? (input as string[])
    : input
      ? [String(input)]
      : [];
  for (const v of values) {
    const parts = v
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of parts) {
      const [field, dirRaw] = p.split(":");
      if (!field) continue;
      const dir = String(dirRaw || "asc").toLowerCase();
      if (dir !== "asc" && dir !== "desc") continue;
      result.push({ field, direction: dir as "asc" | "desc" });
    }
  }

  return result.length ? result : undefined;
}

function parseFilterObj(
  input: Record<string, unknown> | undefined
): FilterParam[] | undefined {
  if (!input) return undefined;
  const res: FilterParam[] = [];
  for (const key of Object.keys(input)) {
    const raw = input[key];
    const vals: string[] = Array.isArray(raw)
      ? (raw as string[])
      : raw !== undefined
        ? [String(raw)]
        : [];
    for (const value of vals) {
      const [opMaybe, rest] = value.includes(":")
        ? [value.split(":")[0], value.substring(value.indexOf(":") + 1)]
        : ["eq", value];
      const op = (opMaybe || "eq").toLowerCase();
      res.push({ field: key, operator: op as any, value: rest });
    }
  }
  return res.length ? res : undefined;
}

function parseFilterArray(values: unknown): FilterParam[] | undefined {
  const list: string[] = Array.isArray(values)
    ? (values as string[])
    : values
      ? [String(values)]
      : [];
  const res: FilterParam[] = [];
  for (const v of list) {
    // формат: field||$op||value
    const [field, op, value] = v.split("||");
    if (!field) continue;
    const operator = String(op || "eq")
      .replace(/^\$/g, "")
      .toLowerCase();
    res.push({ field, operator: operator as any, value });
  }
  return res.length ? res : undefined;
}

export const Paginate = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PaginationQuery => {
    const request: ExpressRequest | FastifyRequest = ctx
      .switchToHttp()
      .getRequest();
    const query = (request as any).query as Record<string, unknown>;

    let originalUrl: string;
    if (isExpressRequest(request)) {
      originalUrl = `${(request as ExpressRequest).protocol}://${(request as ExpressRequest).get("host")}${(request as ExpressRequest).originalUrl}`;
    } else {
      originalUrl = `${(request as FastifyRequest).protocol}://${(request as any).hostname}${(request as any).url}`;
    }
    const url = new URL(originalUrl);
    const path = `${url.protocol}//${url.host}${url.pathname}`;

    const page = query.page ? parseInt(String(query.page), 10) : undefined;
    const limit = query.limit ? parseInt(String(query.limit), 10) : undefined;

    const offset = query.offset
      ? parseInt(String(query.offset), 10)
      : undefined;

    const sort = parseSort(
      query.sort ?? query.sortBy,
      query.orderBy,
      query.sortBy
    );
    const search = query.search ? String(query.search) : undefined;
    const searchBy = Array.isArray(query.searchBy)
      ? (query.searchBy as string[])
      : query.searchBy
        ? String(query.searchBy)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined;
    const select = Array.isArray(query.select)
      ? (query.select as string[])
      : query.select
        ? String(query.select)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined;

    // filter.field=... и filter массив
    const filterObj: Record<string, unknown> = Object.keys(query)
      .filter((k) => k.startsWith("filter."))
      .reduce(
        (acc, k) => {
          acc[k.replace(/^filter\./, "")] = query[k];
          return acc;
        },
        {} as Record<string, unknown>
      );
    const filtersFromObj = parseFilterObj(filterObj);
    const filtersFromArray = parseFilterArray(query.filter);

    const filters = [...(filtersFromObj || []), ...(filtersFromArray || [])];

    return {
      page,
      limit,
      sort,
      search,
      searchBy,
      select,
      filters: filters.length ? filters : undefined,
      path,
      offset,
    } as any;
  }
);
