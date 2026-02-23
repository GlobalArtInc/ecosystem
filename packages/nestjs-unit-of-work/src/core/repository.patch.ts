import { EntityTarget, QueryRunner, Repository } from 'typeorm';
import { uowStorage } from './uow.context';

type RepositoryMethod = keyof Pick<
  Repository<object>,
  | 'save'
  | 'remove'
  | 'softRemove'
  | 'recover'
  | 'insert'
  | 'update'
  | 'upsert'
  | 'delete'
  | 'count'
  | 'countBy'
  | 'sum'
  | 'average'
  | 'minimum'
  | 'maximum'
  | 'find'
  | 'findBy'
  | 'findAndCount'
  | 'findAndCountBy'
  | 'findByIds'
  | 'findOne'
  | 'findOneBy'
  | 'findOneById'
  | 'findOneOrFail'
  | 'findOneByOrFail'
  | 'query'
  | 'increment'
  | 'decrement'
  | 'exist'
  | 'clear'
  | 'preload'
  | 'createQueryBuilder'
>;

const REPOSITORY_METHODS: readonly RepositoryMethod[] = [
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
  'preload',
] as const;

export const patchTypeORMRepository = (): void => {
  for (const method of REPOSITORY_METHODS) {
    const original = Repository.prototype[method] as
      | ((
          this: Repository<object>,
          ...args: unknown[]
        ) => unknown)
      | undefined;
    if (!original) continue;

    (
      Repository.prototype as unknown as Record<
        RepositoryMethod,
        (this: Repository<object>, ...args: unknown[]) => unknown
      >
    )[method] = function (
      this: Repository<object>,
      ...args: unknown[]
    ): unknown {
      const uow = uowStorage.getStore();

      if (!uow?.isActive) {
        return original.apply(this, args);
      }

      const uowRunner = uow.getQueryRunner();
      if (
        (this as unknown as { queryRunner?: QueryRunner }).queryRunner ===
        uowRunner
      ) {
        return original.apply(this, args);
      }

      const transactionalRepo = uow.conn().getRepository(
        (this as unknown as { target: EntityTarget<object> }).target,
      );
      const repoMethod = transactionalRepo[method] as (
        ...args: unknown[]
      ) => unknown;
      return repoMethod.apply(transactionalRepo, args);
    };
  }

  const originalCreateQueryBuilder = Repository.prototype.createQueryBuilder;
  Repository.prototype.createQueryBuilder = function (
    alias?: string,
    queryRunner?: QueryRunner,
  ) {
    const uow = uowStorage.getStore();
    if (!uow?.isActive || queryRunner) {
      return originalCreateQueryBuilder.call(this, alias, queryRunner);
    }

    const uowRunner = uow.getQueryRunner();
    if (
      (this as unknown as { queryRunner?: QueryRunner }).queryRunner ===
      uowRunner
    ) {
      return originalCreateQueryBuilder.call(this, alias, queryRunner);
    }

    const transactionalRepo = uow.conn().getRepository(
      (this as unknown as { target: EntityTarget<object> }).target,
    );
    return transactionalRepo.createQueryBuilder(alias, queryRunner);
  };
};
