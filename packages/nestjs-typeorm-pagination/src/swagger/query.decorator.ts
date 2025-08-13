import { applyDecorators } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";
import { PaginateConfig } from "../types";

export function ApiPaginationQuery(config: PaginateConfig<any> = {}) {
  const decorators: MethodDecorator[] = [];

  decorators.push(
    ApiQuery({
      name: "limit",
      required: false,
      type: Number,
      description: "Limit of items per page",
    }),
    ApiQuery({
      name: "offset",
      required: false,
      type: Number,
      description: "Offset of the first item",
    })
  );

  decorators.push(
    ApiQuery({
      name: "filter",
      required: false,
      type: String,
      isArray: true,
      description:
        "Filters: field||$operator||value. Examples: product||$eq||book, createdAt||$between||2022-01-01,2022-12-31",
    })
  );

  decorators.push(
    ApiQuery({
      name: "orderBy",
      required: false,
      type: String,
      description: "Sort field",
    }),
    ApiQuery({
      name: "sortBy",
      required: false,
      type: String,
      description: "Sort direction: asc|desc",
    })
  );

  decorators.push(
    ApiQuery({
      name: "sort",
      required: false,
      type: String,
      isArray: true,
      description: "Sorting: field:asc|desc. Multiple values are allowed",
    })
  );

  if (config.searchable && config.searchable.length) {
    decorators.push(
      ApiQuery({
        name: "search",
        required: false,
        type: String,
        description: "Search term",
      }),
      ApiQuery({
        name: "searchBy",
        required: false,
        type: String,
        description: `Searchable fields: ${config.searchable.join(", ")}`,
      })
    );
  }

  decorators.push(
    ApiQuery({
      name: "select",
      required: false,
      type: String,
      description: "Comma-separated fields to select",
    })
  );

  if (config.filterable && config.filterable.length) {
    for (const f of config.filterable) {
      decorators.push(
        ApiQuery({
          name: `filter.${f}`,
          required: false,
          type: String,
          isArray: true,
          description: `Field filter (alternative to filter array). Example: filter.${f}=eq:42 | ilike:john | in:1,2,3 | between:10,20`,
        })
      );
    }
  }

  return applyDecorators(...decorators.filter(Boolean));
}
