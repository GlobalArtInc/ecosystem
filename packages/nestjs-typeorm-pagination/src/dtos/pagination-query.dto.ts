import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class PaginationQueryDto {
  @ApiPropertyOptional({ type: Number, description: "limit" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ type: Number, description: "offset" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ type: [String], description: "filter" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filter?: string[];

  @ApiPropertyOptional({ type: String, description: "orderBy" })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({ type: String, description: "sortBy" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === "string" ? value.toUpperCase() : value
  )
  @IsIn(["ASC", "DESC"], { message: "sortBy must be ASC or DESC" })
  sortBy?: string;
}
