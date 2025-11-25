import {
  ERROR_DESCRIPTIONS,
  SwaggerDocumentation,
} from "@globalart/nestjs-swagger";
import {
  CursorPaginationQueryDto,
  CursorPaginationService,
  InjectCursorPagination,
  InjectPagination,
  PaginationQueryDto,
  PaginationService,
} from "@globalart/nestjs-typeorm-pagination";
import { Controller, Get, Query } from "@nestjs/common";
import { Repository } from "typeorm";
import { UserEntity } from "./app.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Controller()
export class AppController {
  constructor(
    @InjectPagination(UserEntity)
    private readonly paginationService: PaginationService<UserEntity>,
    @InjectCursorPagination(UserEntity)
    private readonly cursorPaginationService: CursorPaginationService<UserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  @Get("users")
  @SwaggerDocumentation({
    endpointDescription: "Получить список пользователей с пагинацией",
    endpointSummary: "Список пользователей",
    error400Description: ERROR_DESCRIPTIONS.BAD_REQUEST,
    error401Description: ERROR_DESCRIPTIONS.UNAUTHORIZED,
    error403Description: ERROR_DESCRIPTIONS.FORBIDDEN,
    error404Description: ERROR_DESCRIPTIONS.NOT_FOUND,
    error429Description: ERROR_DESCRIPTIONS.RATE_LIMIT_EXCEEDED,
    error500Description: ERROR_DESCRIPTIONS.INTERNAL_SERVER_ERROR,
  })
  async getUsers(@Query() query: PaginationQueryDto) {
    return this.paginationService.paginate(query, {
      allowedFilters: ["name", "email"],
      allowedOrderBy: ["id", "name", "email"],
      defaultOrderBy: "id",
      defaultOrder: "DESC",
    });
  }

  @Get("users/advanced")
  @SwaggerDocumentation({
    endpointDescription: "Пример с QueryBuilder",
    endpointSummary: "Продвинутый запрос",
    error400Description: ERROR_DESCRIPTIONS.BAD_REQUEST,
    error401Description: ERROR_DESCRIPTIONS.UNAUTHORIZED,
    error403Description: ERROR_DESCRIPTIONS.FORBIDDEN,
    error404Description: ERROR_DESCRIPTIONS.NOT_FOUND,
    error429Description: ERROR_DESCRIPTIONS.RATE_LIMIT_EXCEEDED,
    error500Description: ERROR_DESCRIPTIONS.INTERNAL_SERVER_ERROR,
  })
  async getAdvancedUsers(@Query() query: PaginationQueryDto) {
    const queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .where("user.email LIKE :domain", { domain: "%@example.com" });

    return this.paginationService.paginateQueryBuilder(queryBuilder, query);
  }

  @Get("users/cursor")
  @SwaggerDocumentation({
    endpointDescription: "Cursor-based пагинация для больших таблиц",
    endpointSummary: "Cursor пагинация",
    error400Description: ERROR_DESCRIPTIONS.BAD_REQUEST,
    error401Description: ERROR_DESCRIPTIONS.UNAUTHORIZED,
    error403Description: ERROR_DESCRIPTIONS.FORBIDDEN,
    error404Description: ERROR_DESCRIPTIONS.NOT_FOUND,
    error429Description: ERROR_DESCRIPTIONS.RATE_LIMIT_EXCEEDED,
    error500Description: ERROR_DESCRIPTIONS.INTERNAL_SERVER_ERROR,
  })
  async getUsersByCursor(@Query() query: CursorPaginationQueryDto) {
    return this.cursorPaginationService.paginateByCursor(query, {
      cursorField: "id",
      allowedOrderBy: ["id", "name"],
      defaultOrderBy: "id",
      defaultOrder: "ASC",
    });
  }
}
