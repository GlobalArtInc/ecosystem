import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { IsolationLevel } from '../enums/uow.enums';
import { TypeOrmUnitOfWork } from './uow-typeorm.service';
import { UnitOfWorkContext } from './uow.context';

let unitOfWorkManagerRef: UnitOfWorkManager | null = null;

export function getUnitOfWorkManager(): UnitOfWorkManager {
  if (!unitOfWorkManagerRef) {
    throw new Error(
      "UnitOfWorkModule not initialized. Ensure UnitOfWorkModule.forRoot() is imported in your app."
    );
  }
  return unitOfWorkManagerRef;
}

export function setUnitOfWorkManager(manager: UnitOfWorkManager): void {
  unitOfWorkManagerRef = manager;
}

@Injectable()
export class UnitOfWorkManager implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly context: UnitOfWorkContext,
  ) {}

  onModuleInit(): void {
    setUnitOfWorkManager(this);
  }

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
