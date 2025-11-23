import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ProcessDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: "Resource ID",
    example: "acquire-lock",
  })
  resourceId: string;
}
