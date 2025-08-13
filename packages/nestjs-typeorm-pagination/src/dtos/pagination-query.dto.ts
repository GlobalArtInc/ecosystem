import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, description: "limit" })
  limit?: number;

  @ApiPropertyOptional({ type: Number, description: "offset" })
  offset?: number;

  @ApiPropertyOptional({ type: [String], description: "filter" })
  filter?: string[];

  @ApiPropertyOptional({ type: String, description: "orderBy" })
  orderBy?: string;

  @ApiPropertyOptional({ type: String, description: "sortBy" })
  sortBy?: string;

  @ApiPropertyOptional({ type: Number, description: "page" })
  page?: number;
}
