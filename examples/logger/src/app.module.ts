import { Module, RequestMethod } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { AppController } from "./app.controller";
import { LoggerModule } from "@globalart/nestjs-logger";
import { UserResolver } from "./user.resolver";
import { UserService } from "./user.service";

@Module({
  imports: [
    LoggerModule.forRoot({
      level: "debug",
      timestamp: true,
      colors: true,
      format: "text",
      logRequests: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
      introspection: true,
    }),
  ],
  controllers: [AppController],
  providers: [UserResolver, UserService],
})
export class AppModule {}
