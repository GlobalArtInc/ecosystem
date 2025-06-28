import { ObjectType, Field, ID } from "@nestjs/graphql";

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  bio?: string;

  @Field()
  createdAt: Date;
}
