import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { PaginationModule } from "@globalart/nestjs-typeorm-pagination";
import { UserEntity } from "./app.entity";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      host: "localhost",
      port: 57177,
      type: "postgres",
      username: "postgres",
      password: "postgres",
      database: "postgres",
      synchronize: true,
      entities: [UserEntity],
    }),
    TypeOrmModule.forFeature([UserEntity]),
    PaginationModule.forRoot({
      defaultLimit: 10,
      maxLimit: 100,
    }),
    PaginationModule.forFeature(UserEntity, {
      withCursorPagination: true,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
