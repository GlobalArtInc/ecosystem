import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { InjectLogger, LoggerService } from "@globalart/nestjs-logger";
import { User } from "./user.model";
import { CreateUserInput } from "./user.dto";
import { UserService } from "./user.service";

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    @InjectLogger(UserResolver.name)
    private readonly logger: LoggerService
  ) {}

  @Query(() => [User], { name: "users" })
  async getUsers(): Promise<User[]> {
    this.logger.log({
      message: "GraphQL query: get all users",
      context: "GraphQLResolver",
    });
    return this.userService.findAll();
  }

  @Query(() => User, { name: "user", nullable: true })
  async getUser(
    @Args("id", { type: () => ID }) id: string
  ): Promise<User | null> {
    this.logger.log({
      message: "GraphQL query: get user by ID",
      context: "GraphQLResolver",
      metadata: { userId: id },
    });
    return this.userService.findOne(id);
  }

  @Mutation(() => User)
  async createUser(@Args("input") input: CreateUserInput): Promise<User> {
    this.logger.log({
      message: "GraphQL mutation: create user",
      context: "GraphQLResolver",
      metadata: { userEmail: input.email, userName: input.name },
    });
    return this.userService.create(input);
  }

  @Mutation(() => Boolean)
  async deleteUser(
    @Args("id", { type: () => ID }) id: string
  ): Promise<boolean> {
    this.logger.log({
      message: "GraphQL mutation: delete user",
      context: "GraphQLResolver",
      metadata: { userId: id },
    });
    return this.userService.delete(id);
  }
}
