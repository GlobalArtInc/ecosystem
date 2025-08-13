import { applyDecorators, Type } from "@nestjs/common";
import { ApiPaginationQuery } from "./query.decorator";
import { ApiOkPaginatedResponse } from "./response.decorator";

export function PaginatedSwaggerDocs<DTO extends Type<unknown>>(
  dto: DTO,
  options?: { query?: Parameters<typeof ApiPaginationQuery>[0] }
) {
  return applyDecorators(
    ApiPaginationQuery(options?.query || {}),
    ApiOkPaginatedResponse(dto)
  );
}
