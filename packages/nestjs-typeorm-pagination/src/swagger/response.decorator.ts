import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";

export function ApiOkPaginatedResponse<DTO extends Type<unknown>>(dto: DTO) {
  return applyDecorators(
    ApiExtraModels(dto),
    ApiOkResponse({
      schema: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: getSchemaPath(dto) },
          },
          meta: {
            type: "object",
            properties: {
              totalItems: { type: "number" },
              itemCount: { type: "number" },
              itemsPerPage: { type: "number" },
              totalPages: { type: "number" },
              currentPage: { type: "number" },
            },
            required: [
              "totalItems",
              "itemCount",
              "itemsPerPage",
              "totalPages",
              "currentPage",
            ],
          },
        },
        required: ["data", "meta"],
      },
    })
  );
}
