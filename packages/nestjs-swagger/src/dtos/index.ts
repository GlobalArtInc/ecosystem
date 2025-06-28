import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  data!: T[];

  @ApiProperty()
  totalCount!: number;

  @ApiProperty()
  offset!: number;

  @ApiProperty()
  limit!: number;
}
