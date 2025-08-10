import { InputType, Field } from "@nestjs/graphql";
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from "class-validator";

@InputType()
export class CreateUserInput {
  @Field()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  bio?: string;
}
