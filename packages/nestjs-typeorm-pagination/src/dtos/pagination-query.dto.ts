import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, description: "Limit of items per page" })
  limit?: number;

  @ApiPropertyOptional({
    type: Number,
    description: "Offset of the first item",
  })
  offset?: number;

  @ApiPropertyOptional({
    type: String,
    isArray: true,
    description:
      "Filters in format field||$operator||value. E.g.: product||$eq||book, createdAt||$between||2022-12-12,2023-12-12",
  })
  filter?: string[];

  @ApiPropertyOptional({ type: String, description: "Sort field" })
  orderBy?: string;

  @ApiPropertyOptional({
    type: String,
    description: "Sort direction (asc|desc)",
  })
  sortBy?: string;
}
