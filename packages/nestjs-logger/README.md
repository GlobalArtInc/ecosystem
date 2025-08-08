# @globalart/nestjs-logger

A professional logging module for NestJS with clean architecture, strict typing, and extensibility.

## 🚀 Features

- **Clean Architecture** - separation of concerns, SOLID principles
- **Strict Typing** - full TypeScript type safety
- **Performance** - optimized architecture with minimal allocations
- **Extensibility** - easy to add new formatters and transports
- **Testability** - dependency injection, easy mocking
- **Automatic Context** - class detection from call stack
- **HTTP Logging** - detailed request logging with format consistency
- **Security** - automatic sanitization of sensitive data
- **Colored Output** - beautiful console logs
- **Multiple Formats** - Text, JSON, and Pino support

## 📦 Installation

```bash
npm install @globalart/nestjs-logger
```

## 🎯 Quick Start

```typescript
import { Module } from '@nestjs/common';
import { LoggerModule } from '@globalart/nestjs-logger';

@Module({
  imports: [
    LoggerModule.forRoot({
      level: 'info',
      timestamp: true,
      colors: true,
      format: 'text',
    }),
  ],
})
export class AppModule {}
```

## 🔧 Configuration

### Synchronous Configuration

```typescript
LoggerModule.forRoot({
  level: 'debug',
  timestamp: true,
  colors: true,
  format: 'pino',
  sensitiveFields: ['password', 'secret'],
  exclude: ['/health', '/metrics'],
})
```

### Asynchronous Configuration

```typescript
LoggerModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    level: configService.get('LOG_LEVEL', 'info'),
    format: configService.get('LOG_FORMAT', 'text'),
    colors: !configService.get('PRODUCTION'),
    sensitiveFields: configService.get('SENSITIVE_FIELDS', []),
  }),
  inject: [ConfigService],
})
```

## 📝 Usage

### In Services

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@globalart/nestjs-logger';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {}

  async createUser(userData: CreateUserDto) {
    this.logger.log({
      message: 'Creating new user',
      metadata: { userId: userData.email }
    });
    
    try {
      const user = await this.userRepository.save(userData);
      this.logger.log({
        message: 'User created successfully',
        metadata: { id: user.id }
      });
      return user;
    } catch (error) {
      this.logger.error({
        message: 'Failed to create user',
        trace: error.stack,
        metadata: { email: userData.email }
      });
      throw error;
    }
  }
}
```

### HTTP Logging

```typescript
import { Controller, UseInterceptors } from '@nestjs/common';
import { HttpLoggerInterceptor, LogContext } from '@globalart/nestjs-logger';

@Controller('users')
@UseInterceptors(HttpLoggerInterceptor)
@LogContext('UserController')
export class UserController {
  // All HTTP requests will be automatically logged
}
```

### Global HTTP Logging

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule, HttpLoggerInterceptor } from '@globalart/nestjs-logger';

@Module({
  imports: [LoggerModule.forRoot()],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggerInterceptor,
    },
  ],
})
export class AppModule {}
```

## 🎨 Output Formats

### Text Format (Default)
```
[2024-01-15T10:30:45.123Z] [INFO] [UserService] Creating new user {"userId":"123"}
[2024-01-15T10:30:45.335Z] [INFO] [HttpLogger] GET /users - 200 (12ms)
```

### JSON Format
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Creating new user",
  "context": "UserService",
  "metadata": {"userId": "123"}
}
{
  "timestamp": "2024-01-15T10:30:45.335Z",
  "level": "info",
  "message": "GET /users - 200 (12ms)",
  "context": "HttpLogger",
  "metadata": {
    "requestId": "req-123",
    "method": "GET",
    "url": "/users",
    "statusCode": 200,
    "responseTime": 12,
    "remoteAddress": "127.0.0.1"
  }
}
```

### Pino Format
```json
{"level":30,"time":1642247445123,"pid":1234,"hostname":"app-server","req":{"id":"req-123","method":"GET","url":"/users","query":{},"params":{},"headers":{},"remoteAddress":"127.0.0.1"},"res":{"statusCode":200,"headers":{}},"responseTime":12,"msg":"request completed"}
```

## 🎯 API Reference

### LoggerService

| Method | Description |
|--------|-------------|
| `log(options: LogOptions)` | Information message |
| `error(options: LogOptions)` | Error with trace |
| `warn(options: LogOptions)` | Warning message |
| `debug(options: LogOptions)` | Debug information |
| `verbose(options: LogOptions)` | Verbose logging |
| `setContext(context: string)` | Set context |
| `logHttpRequest(entry: HttpRequestLogEntry)` | Log HTTP request (Pino format only) |

### LogOptions Interface

```typescript
interface LogOptions {
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  trace?: string;
}
```

### Decorators

- `@LogContext(context: string)` - Set context for class/method
- `@LogMetadata(metadata: Record<string, unknown>)` - Add metadata to logs
- `@ExcludeLogging()` - Exclude logging for controller/method

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | `LogLevel` | `'info'` | Logging level |
| `timestamp` | `boolean` | `true` | Show timestamp |
| `colors` | `boolean` | `true` | Colored output |
| `format` | `LogFormat` | `'text'` | Output format |
| `context` | `string` | `undefined` | Default context |
| `sensitiveFields` | `string[]` | `[...]` | Fields to sanitize |
| `exclude` | `string[]` | `[]` | URLs to exclude from HTTP logging |

## 🏗️ Architecture

The package is built on Clean Architecture principles:

### Core Components

- **LoggerModule** - Main module with configuration
- **LoggerService** - Primary logging service
- **HttpLoggerInterceptor** - HTTP request logging interceptor

### Formatters

- **TextFormatter** - Human-readable text output
- **JsonFormatter** - Structured JSON output
- **PinoFormatter** - Pino-compatible JSON output

### Utilities

- **ContextResolver** - Automatic context detection
- **DataSanitizer** - Sensitive data sanitization
- **RequestIdGenerator** - Unique request ID generation

### Writers

- **ConsoleWriter** - Console output (extensible for other transports)

### Contracts & Types

- **ILogger** - Logger interface
- **ILogFormatter** - Formatter interface
- **ILogWriter** - Writer interface
- **LogEntry** - Standard log entry structure
- **HttpRequestLogEntry** - HTTP-specific log entry structure

## 🔒 Security

Automatic sanitization of sensitive fields:
- `password`, `pass`
- `token`, `accessToken`, `refreshToken`
- `secret`, `key`, `apiKey`
- `authorization`, `auth`
- `credential`, `credentials`

## 🧪 Testing

```typescript
import { LoggerService } from '@globalart/nestjs-logger';

describe('UserService', () => {
  let service: UserService;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      setContext: jest.fn(),
      logHttpRequest: jest.fn(),
    } as any;

    service = new UserService(logger);
  });

  it('should log user creation', () => {
    service.createUser(userData);
    expect(logger.log).toHaveBeenCalledWith({
      message: 'Creating new user',
      metadata: { userId: userData.email }
    });
  });
});
```

## 🔄 Migration from v1

```typescript
// v1 (old API)
import { LoggerModule, LoggerInterceptor } from '@globalart/nestjs-logger';

// v2 (new API)  
import { LoggerModule, HttpLoggerInterceptor } from '@globalart/nestjs-logger';

// Legacy exports available for compatibility:
import { LegacyLoggerModule, LoggerInterceptor } from '@globalart/nestjs-logger';
```

## 📈 Performance

- Minimal allocations in hot paths
- Lazy formatter initialization
- Optimized context resolution
- Efficient data sanitization
- Format-specific HTTP logging optimization

## 🎨 Customization

### Custom Formatter

```typescript
import { Injectable } from '@nestjs/common';
import { BaseFormatter } from '@globalart/nestjs-logger';

@Injectable()
export class CustomFormatter extends BaseFormatter {
  format(entry: LogEntry): string {
    return `[${entry.level.toUpperCase()}] ${entry.message}`;
  }

  formatHttpRequest(entry: HttpRequestLogEntry): string {
    return JSON.stringify(entry);
  }
}
```

### Custom Writer

```typescript
import { Injectable } from '@nestjs/common';
import { ILogWriter } from '@globalart/nestjs-logger';

@Injectable()
export class FileWriter implements ILogWriter {
  write(formattedLog: string): void {
    // Write to file
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Create a Pull Request

## 📄 License

MIT License 