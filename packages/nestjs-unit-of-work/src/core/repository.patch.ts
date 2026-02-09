import { Repository } from 'typeorm';
import { uowStorage } from './uow.context';

export const patchTypeORMRepository = () => {
  const methods = [
    'save',
    'remove',
    'softRemove',
    'recover',
    'insert',
    'update',
    'upsert',
    'delete',
    'count',
    'countBy',
    'sum',
    'average',
    'minimum',
    'maximum',
    'find',
    'findBy',
    'findAndCount',
    'findAndCountBy',
    'findByIds',
    'findOne',
    'findOneBy',
    'findOneById',
    'findOneOrFail',
    'findOneByOrFail',
    'query',
    'increment',
    'decrement',
    'exist',
    'clear', 
    'preload'
  ] as const;

  for (const method of methods) {
    const original = Repository.prototype[method];
    if (!original) continue;

    (Repository.prototype as any)[method] = function (this: Repository<any>, ...args: any[]) {
      const uow = uowStorage.getStore();
      
      if (!uow || !uow.isActive) {
          return (original as Function).apply(this, args);
      }
      
      const uowRunner = uow.getQueryRunner();
      
      if (this.queryRunner === uowRunner) {
           return (original as Function).apply(this, args);
      }

      const transactionalRepo = uow.conn().getRepository(this.target);
      return (transactionalRepo[method] as Function).apply(transactionalRepo, args);
    };
  }
  
  const originalCreateQueryBuilder = Repository.prototype.createQueryBuilder;
  Repository.prototype.createQueryBuilder = function (alias?: string, queryRunner?: any) {
      const uow = uowStorage.getStore();
      if (!uow || !uow.isActive || queryRunner) {
        return originalCreateQueryBuilder.call(this, alias, queryRunner);
      }
      
      const uowRunner = uow.getQueryRunner();
      if (this.queryRunner === uowRunner) {
        return originalCreateQueryBuilder.call(this, alias, queryRunner);
      }
      
      const transactionalRepo = uow.conn().getRepository(this.target);
      return transactionalRepo.createQueryBuilder(alias, queryRunner);
  }
};
