# @globalart/nestjs-daemon

Модуль для создания и управления фоновыми демонами в NestJS с распределенным управлением через Redis.

## Возможности

- **Многократное использование**: Можно запускать несколько демонов с разной логикой в одном приложении.
- **Распределенное управление**: Управление состоянием (START/STOP/PAUSE) и конфигурацией через Redis.
- **Динамическая конфигурация**: Изменение интервалов и задержек без перезапуска приложения.
- **Устойчивость**: Автоматические повторы при ошибках.

## Использование

1. Создайте класс рабочего (Worker), унаследованный от `AbstractDaemon`:

```typescript
import { AbstractDaemon } from '@globalart/nestjs-daemon';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyWorker extends AbstractDaemon {
  async perform() {
    this.logger.log('Performing background task...');
    // Ваша бизнес-логика
  }
}
```

2. Подключите модуль в `AppModule`:

```typescript
import { DaemonModule } from '@globalart/nestjs-daemon';

@Module({
  imports: [
    DaemonModule.register({
      name: 'my-background-task',
      worker: MyWorker,
      defaultInterval: 5000, // 5 секунд
    }),
  ],
})
export class AppModule {}
```

## Управление через Redis

Для демона с именем `my-background-task`:

- **Управление**: `set daemon:my-background-task:control "STOP"` (или `START`, `PAUSE`)
- **Интервал**: `set daemon:my-background-task:interval 30000` (в мс)
- **Статус**: `get daemon:my-background-task:heartbeat`
