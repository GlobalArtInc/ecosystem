import { Injectable } from "@nestjs/common";
import { InjectLogger, LoggerService } from "@globalart/nestjs-logger";
import { User } from "./user.model";
import { CreateUserInput } from "./user.dto";

@Injectable()
export class UserService {
  private users: User[] = [
    {
      id: "1",
      name: "Ivan Ivanov",
      email: "ivan@example.com",
      bio: "Developer",
      createdAt: new Date("2024-01-15"),
    },
    {
      id: "2",
      name: "Maria Petrova",
      email: "maria@example.com",
      createdAt: new Date("2024-02-20"),
    },
  ];

  constructor(
    @InjectLogger(UserService.name)
    private readonly logger: LoggerService
  ) {}

  async findAll(): Promise<User[]> {
    this.logger.log({
      message: "Fetching all users",
      metadata: { count: this.users.length },
    });
    return this.users;
  }

  async findOne(id: string): Promise<User | null> {
    this.logger.log({
      message: "Searching user by ID",
      metadata: { userId: id },
    });

    const user = this.users.find((u) => u.id === id);

    if (!user) {
      this.logger.warn({
        message: "User not found",
        metadata: { userId: id },
      });
    }

    return user || null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const newUser: User = {
      id: (this.users.length + 1).toString(),
      ...input,
      createdAt: new Date(),
    };

    this.users.push(newUser);

    this.logger.log({
      message: "New user created",
      metadata: {
        userId: newUser.id,
        userEmail: newUser.email,
        userName: newUser.name,
      },
    });

    return newUser;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.users.findIndex((u) => u.id === id);

    if (index === -1) {
      this.logger.warn({
        message: "Attempt to delete non-existent user",
        metadata: { userId: id },
      });
      return false;
    }

    const deletedUser = this.users.splice(index, 1)[0];

    this.logger.log({
      message: "User deleted",
      metadata: {
        userId: deletedUser.id,
        userEmail: deletedUser.email,
      },
    });

    return true;
  }
}
