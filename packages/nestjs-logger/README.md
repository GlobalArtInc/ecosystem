# @globalart/nestjs-logger

Профессиональный модуль логирования для NestJS с чистой архитектурой, строгой типизацией и расширяемостью.

## 🚀 Особенности

- **Clean Architecture** - разделение ответственности, SOLID принципы
- **Строгая типизация** - полная типобезопасность TypeScript
- **Производительность** - оптимизированная архитектура без лишних аллокаций
- **Расширяемость** - легко добавлять новые форматтеры и транспорты
- **Тестируемость** - dependency injection, легкое мокирование
- **Автоматический контекст** - определение класса из стека вызовов
- **HTTP логирование** - детальное логирование запросов
- **Безопасность** - автоматическая санитизация чувствительных данных
- **Цветной вывод** - красивые логи в консоли

## 📦 Установка

```bash
npm install @globalart/nestjs-logger
```

## 🎯 Быстрый старт

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

## 🔧 Конфигурация

### Синхронная конфигурация

```typescript
LoggerModule.forRoot({
  level: 'debug',
  timestamp: true,
  colors: true,
  format: 'pino',
  sensitiveFields: ['password', 'secret'],
})
```

### Асинхронная конфигурация

```typescript
LoggerModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    level: configService.get('LOG_LEVEL', 'info'),
    format: configService.get('LOG_FORMAT', 'text'),
    colors: !configService.get('PRODUCTION'),
  }),
  inject: [ConfigService],
})
```

## 📝 Использование

### В сервисах

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@globalart/nestjs-logger';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {}

  async createUser(userData: CreateUserDto) {
    this.logger.log('Creating new user', undefined, { userId: userData.email });
    
    try {
      const user = await this.userRepository.save(userData);
      this.logger.log('User created successfully', undefined, { id: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack, undefined, { 
        email: userData.email 
      });
      throw error;
    }
  }
}
```

### HTTP логирование

```typescript
import { Controller, UseInterceptors } from '@nestjs/common';
import { HttpLoggerInterceptor, LogContext } from '@globalart/nestjs-logger';

@Controller('users')
@UseInterceptors(HttpLoggerInterceptor)
@LogContext('UserController')
export class UserController {
  // Все HTTP запросы будут автоматически логироваться
}
```

### Глобальное HTTP логирование

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

## 🎨 Форматы вывода

### Text (по умолчанию)
```
[2024-01-15T10:30:45.123Z] [INFO] [UserService] Creating new user {"userId":"123"}
```

### JSON
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Creating new user",
  "context": "UserService",
  "metadata": {"userId": "123"}
}
```

### Pino (HTTP запросы)
```json
{"level":30,"time":1642247445123,"pid":1234,"hostname":"app-server","req":{"id":"req-123","method":"GET","url":"/users","query":{},"params":{},"headers":{},"remoteAddress":"127.0.0.1"},"res":{"statusCode":200,"headers":{}},"responseTime":15,"msg":"request completed"}
```

## 🎯 API Reference

### LoggerService

| Метод | Описание |
|-------|----------|
| `log(message, context?, metadata?)` | Информационное сообщение |
| `error(message, trace?, context?, metadata?)` | Ошибка с трейсом |
| `warn(message, context?, metadata?)` | Предупреждение |
| `debug(message, context?, metadata?)` | Отладочная информация |
| `verbose(message, context?, metadata?)` | Подробное логирование |
| `setContext(context)` | Установка контекста |

### Декораторы

- `@LogContext(context)` - Установка контекста для класса/метода
- `@LogMetadata(metadata)` - Добавление метаданных

### Конфигурация

| Опция | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `level` | `LogLevel` | `'info'` | Уровень логирования |
| `timestamp` | `boolean` | `true` | Показывать время |
| `colors` | `boolean` | `true` | Цветной вывод |
| `format` | `LogFormat` | `'text'` | Формат вывода |
| `context` | `string` | `undefined` | Контекст по умолчанию |
| `sensitiveFields` | `string[]` | `[...]` | Поля для санитизации |

## 🏗️ Архитектура

Пакет построен на принципах Clean Architecture:

- **Types** - строгая типизация
- **Contracts** - интерфейсы для расширяемости  
- **Core** - основная бизнес-логика
- **Utils** - вспомогательные утилиты
- **Formatters** - форматирование логов
- **Writers** - вывод логов

## 🔒 Безопасность

Автоматическая санитизация чувствительных полей:
- `password`, `pass`
- `token`, `accessToken`, `refreshToken`
- `secret`, `key`, `apiKey`
- `authorization`, `auth`
- `credential`, `credentials`

## 🧪 Тестирование

```typescript
import { LoggerService } from '@globalart/nestjs-logger';

describe('UserService', () => {
  let service: UserService;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      // ... другие методы
    } as any;

    service = new UserService(logger);
  });

  it('should log user creation', () => {
    service.createUser(userData);
    expect(logger.log).toHaveBeenCalledWith(
      'Creating new user',
      undefined,
      { userId: userData.email }
    );
  });
});
```

## 🔄 Миграция с v1

```typescript
// v1 (старый API)
import { LoggerModule, LoggerInterceptor } from '@globalart/nestjs-logger';

// v2 (новый API)  
import { LoggerModule, HttpLoggerInterceptor } from '@globalart/nestjs-logger';

// Для совместимости доступны legacy экспорты:
import { LegacyLoggerModule, LoggerInterceptor } from '@globalart/nestjs-logger';
```

## 📈 Производительность

- Минимальные аллокации в горячих путях
- Ленивая инициализация форматтеров
- Оптимизированное определение контекста
- Эффективная санитизация данных

## 🤝 Вклад в развитие

1. Fork репозитория
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License 