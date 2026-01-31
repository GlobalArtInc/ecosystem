import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TypeOrmUnitOfWork } from './uow-typeorm.service';

@Injectable()
export class UnitOfWorkContext {
  private readonly storage = new AsyncLocalStorage<TypeOrmUnitOfWork>();

  run(uow: TypeOrmUnitOfWork, callback: () => any) {
    return this.storage.run(uow, callback);
  }

  get(): TypeOrmUnitOfWork | undefined {
    return this.storage.getStore();
  }
}

