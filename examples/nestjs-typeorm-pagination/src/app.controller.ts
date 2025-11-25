import {
  ERROR_DESCRIPTIONS,
  SwaggerDocumentation,
} from "@globalart/nestjs-swagger";
import {
  InjectPagination,
  PaginationQueryDto,
  PaginationService,
} from "@globalart/nestjs-typeorm-pagination";
import { Controller, Get, Query } from "@nestjs/common";
import { Column, PrimaryGeneratedColumn, Repository } from "typeorm";
import { UserEntity } from "./app.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Controller()
export class AppController {
  constructor(
    @InjectPagination(UserEntity)
    private readonly paginationService: PaginationService<UserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  @Get("hello")
  @SwaggerDocumentation({
    endpointDescription: "Example description",
    endpointSummary: "Example summary",
    error400Description: ERROR_DESCRIPTIONS.BAD_REQUEST,
    error401Description: ERROR_DESCRIPTIONS.UNAUTHORIZED,
    error403Description: ERROR_DESCRIPTIONS.FORBIDDEN,
    error404Description: ERROR_DESCRIPTIONS.NOT_FOUND,
    error429Description: ERROR_DESCRIPTIONS.RATE_LIMIT_EXCEEDED,
    error500Description: ERROR_DESCRIPTIONS.INTERNAL_SERVER_ERROR,
  })
  async hello(@Query() data: PaginationQueryDto) {
    return this.paginationService.paginate(data);
  }
}
