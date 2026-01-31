import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { IsolationLevel } from '../enums/uow.enums';
import { TypeOrmUnitOfWork } from './uow-typeorm.service';
import { UnitOfWorkContext } from './uow.context';

@Injectable()
export class UnitOfWorkManager {
  constructor(
    private readonly dataSource: DataSource,
    private readonly context: UnitOfWorkContext,
  ) {}

  create(): TypeOrmUnitOfWork {
    return new TypeOrmUnitOfWork(this.dataSource);
  }

  getEntityManager(): EntityManager {
    const uow = this.context.get();
    if (uow && uow.isActive) {
      return uow.conn();
    }
    return this.dataSource.manager;
  }

  async runInTransaction<T>(
    fn: (uow: TypeOrmUnitOfWork) => Promise<T>,
    isolationLevel = IsolationLevel.READ_COMMITTED,
  ): Promise<T> {
    const uow = this.create();
    return this.context.run(uow, async () => {
      try {
        await uow.begin(isolationLevel);
        const result = await fn(uow);
        await uow.commit();
        return result;
      } catch (error) {
        await uow.rollback();
        throw error;
      }
    });
  }
}
