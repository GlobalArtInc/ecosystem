import { ConfigurableModuleAsyncOptions } from '@nestjs/common';
import { RedisOptionsFactory } from './redis-options-factory.interface';
import { RedisModuleOptions } from '../redis-client.types';

/**
 * Options for dynamically configuring the Redis module.
 *
 * @publicApi
 */
export interface RedisModuleAsyncOptions
  extends ConfigurableModuleAsyncOptions<
    RedisModuleOptions,
    keyof RedisOptionsFactory
  > {
  /**
   * If "true", register `RedisModule` as a global module.
   */
  isGlobal?: boolean;

  /**
   * The name of the connection. Used to create multiple named connections.
   */
  connectionName?: string;
}
