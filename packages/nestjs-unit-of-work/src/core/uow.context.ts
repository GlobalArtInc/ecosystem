import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TypeOrmUnitOfWork } from './uow-typeorm.service';

export const uowStorage = new AsyncLocalStorage<TypeOrmUnitOfWork>();

@Injectable()
export class UnitOfWorkContext {
  run(uow: TypeOrmUnitOfWork, callback: () => any) {
    return uowStorage.run(uow, callback);
  }

  get(): TypeOrmUnitOfWork | undefined {
    return uowStorage.getStore();
  }
}
