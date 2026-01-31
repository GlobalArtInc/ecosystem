import { IUnitOfWork } from '@globalart/ddd';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { IsolationLevel } from '../enums/uow.enums';

export class TypeOrmUnitOfWork implements IUnitOfWork<EntityManager> {
  private queryRunner?: QueryRunner;
  private transactionManager?: EntityManager;

  constructor(private readonly dataSource: DataSource) {}

  async begin(isolationLevel = IsolationLevel.READ_COMMITTED): Promise<void> {
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction(isolationLevel);
    this.transactionManager = this.queryRunner.manager;
  }

  async commit(): Promise<void> {
    if (!this.queryRunner) {
      throw new Error('Unit of work is not started');
    }
    await this.queryRunner.commitTransaction();
    await this.queryRunner.release();
  }

  async rollback(): Promise<void> {
    if (!this.queryRunner) {
      return;
    }
    if (this.queryRunner.isTransactionActive) {
      await this.queryRunner.rollbackTransaction();
    }
    if (!this.queryRunner.isReleased) {
      await this.queryRunner.release();
    }
  }

  conn(): EntityManager {
    if (!this.transactionManager) {
      throw new Error('Unit of work is not started or has been released');
    }
    return this.transactionManager;
  }

  get isActive(): boolean {
    return !!this.queryRunner?.isTransactionActive;
  }
}
