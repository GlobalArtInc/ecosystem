import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  UseInterceptors,
} from "@nestjs/common";
import { ExcludeLogging, InjectLogger } from "@globalart/nestjs-logger";
import { LoggerService } from "@globalart/nestjs-logger";
import {
  UploadedFiles,
  UploadedFile,
  MultipartInterceptor,
  MultiPartFile,
} from "@globalart/nestjs-fastify";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiConsumes, ApiPropertyOptional } from "@nestjs/swagger";

export class Data {
  @ApiPropertyOptional({ description: "Test", type: 'string' })
  @IsOptional()
  @IsString()
  test: string;
}

@Controller()
export class AppController {
  constructor(
    @InjectLogger(AppController.name)
    private readonly logger: LoggerService
  ) {}

  @UseInterceptors(MultipartInterceptor({ maxFileSize: 1024 * 1024 * 10 }))
  @ApiConsumes("multipart/form-data")
  @Post("info")
  loggerInfo(
    @Body() data: Data,
    @UploadedFile("file")
    singleFile: MultiPartFile,
    @UploadedFile("file2")
    singleFile2: MultiPartFile,
  ) {
    console.log("Single file:", singleFile);
  }
}
