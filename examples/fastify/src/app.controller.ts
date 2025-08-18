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
  UploadedFile,
  UploadedFiles,
  MultipartInterceptor,
  MultiPartFile,
} from "@globalart/nestjs-fastify";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiConsumes, ApiPropertyOptional } from "@nestjs/swagger";

class dto {
  @ApiPropertyOptional({
    description: "File",
    type: "string",
    format: "binary",
  })
  @IsOptional()
  file?: any;
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
    @Body()
    body: dto,
    @UploadedFile("file")
    singleFile: MultiPartFile<"file">,
    @UploadedFiles()
    allFiles: MultiPartFile<"file">
  ) {
    console.log("Single file:", singleFile);
    console.log("All files:", allFiles);
  }
}
