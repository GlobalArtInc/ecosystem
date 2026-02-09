import { Inject } from '@nestjs/common';
import { RedisToken } from './redis-client.di-tokens';

export const InjectRedis = (connectionName?: string) =>
  Inject(RedisToken(connectionName));
