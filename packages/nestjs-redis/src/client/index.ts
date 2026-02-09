export { RedisModule } from './redis-client.module';
export { InjectRedis } from './redis-client.decorators';
export type {
  RedisModuleOptions,
  RedisConnectionConfig,
  RedisModuleForRootOptions,
  RedisOptions,
} from './redis-client.types';
export { RedisToken } from './redis-client.di-tokens';
export type {
  RedisOptionsFactory,
  RedisModuleAsyncOptions,
} from './interfaces';
