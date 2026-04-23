import { Injectable } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import type { RedisClientType, RedisClusterType, RedisSentinelType } from 'redis';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

@Injectable()
export class RedisHealthIndicator {
  async isHealthy(
    key: string,
    { client }: { client: RedisClientLike },
  ): Promise<HealthIndicatorResult> {
    try {
      const result = await (client as RedisClientType).ping();
      if (result !== 'PONG') {
        return { [key]: { status: 'down', message: `Unexpected ping response: ${result}` } };
      }
      return { [key]: { status: 'up' } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Redis connection failed';
      return { [key]: { status: 'down', message } };
    }
  }
}
