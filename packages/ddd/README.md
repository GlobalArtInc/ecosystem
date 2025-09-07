# @globalart/ddd

A comprehensive Domain-Driven Design (DDD) toolkit for NestJS applications, providing essential building blocks for building robust, maintainable domain models.

## Features

- **Aggregate Root**: Base class for domain aggregates with domain event management
- **Command & Query**: CQRS pattern implementation with command and query buses
- **Value Objects**: Type-safe value objects with equality comparison
- **Specifications**: Composite specification pattern for business rules
- **Filtering**: Advanced filtering system with type-safe field operations
- **Pagination**: Built-in pagination support with validation
- **Repository Pattern**: Abstract repository interface
- **Unit of Work**: Transaction management abstraction
- **Domain Events**: Event-driven architecture support
- **Exception Handling**: Domain-specific exception base classes

## Installation

```bash
npm install @globalart/ddd
```

## Quick Start

### Aggregate Root

```typescript
import { AggregateRoot } from '@globalart/ddd';

class UserCreatedEvent {
  constructor(public readonly userId: string, public readonly email: string) {}
}

class User extends AggregateRoot<UserCreatedEvent> {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string
  ) {
    super();
    this.addDomainEvent(new UserCreatedEvent(id, email));
  }
}
```

### Value Objects

```typescript
import { ValueObject } from '@globalart/ddd';

class Email extends ValueObject<string> {
  constructor(value: string) {
    if (!this.isValidEmail(value)) {
      throw new Error('Invalid email format');
    }
    super({ value });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// Usage
const email = new Email('user@example.com');
const emailValue = email.unpack(); // 'user@example.com'
```

### Commands and Queries

```typescript
import { Command, Query } from '@globalart/ddd';

class CreateUserCommand extends Command {
  constructor(
    public readonly email: string,
    public readonly name: string,
    correlationId?: string
  ) {
    super({ correlationId });
  }
}

class GetUserQuery extends Query {
  constructor(public readonly userId: string) {
    super();
  }
}
```

### Specifications

```typescript
import { CompositeSpecification } from '@globalart/ddd';

class UserEmailSpecification extends CompositeSpecification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.email.includes('@');
  }

  mutate(user: User): Result<User, string> {
    return this.isSatisfiedBy(user) 
      ? Ok(user) 
      : Err('Invalid email format');
  }

  accept(visitor: ISpecVisitor): Result<void, string> {
    return Ok(undefined);
  }
}

// Usage
const emailSpec = new UserEmailSpecification();
const isValid = emailSpec.isSatisfiedBy(user);
```

### Filtering

```typescript
import { StringFilter, NumberFilter, DateFilter } from '@globalart/ddd';

// String filtering
const nameFilter = new StringFilter('name', 'contains', 'john');

// Number filtering
const ageFilter = new NumberFilter('age', 'gte', 18);

// Date filtering
const createdFilter = new DateFilter('createdAt', 'after', new Date('2023-01-01'));
```

### Pagination

```typescript
import { IPagination, paginationSchema } from '@globalart/ddd';

const pagination: IPagination = {
  limit: 10,
  offset: 0
};

// Validation
const result = paginationSchema.parse(pagination);
```

### Repository Pattern

```typescript
import { Repository } from '@globalart/ddd';

interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
  findActiveUsers(): Promise<User[]>;
}
```

## API Reference

### Core Classes

- `AggregateRoot<E>` - Base class for domain aggregates
- `Command` - Base class for commands with correlation tracking
- `Query` - Base class for queries
- `ValueObject<T>` - Base class for value objects
- `CompositeSpecification<T>` - Base class for business rules

### Value Objects

- `Id` - UUID-based identifier
- `NanoId` - NanoID-based identifier
- `StringVO` - String value object
- `BooleanVO` - Boolean value object
- `DateVO` - Date value object

### Filtering

- `StringFilter` - String field filtering
- `NumberFilter` - Numeric field filtering
- `DateFilter` - Date field filtering
- `RootFilter` - Filter composition

### Utilities

- `IPagination` - Pagination interface
- `ISort` - Sorting interface
- `Repository<T>` - Repository interface
- `UnitOfWork` - Transaction management

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
