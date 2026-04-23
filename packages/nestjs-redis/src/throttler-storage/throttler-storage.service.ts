import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import type { RedisClientType, RedisClusterType, RedisSentinelType } from 'redis';

type RedisClientLike = RedisClientType | RedisClusterType | RedisSentinelType;

const LUA_SCRIPT = `
local key = KEYS[1]
local blockKey = KEYS[2]
local throttlerName = ARGV[1]
local ttlMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local blockDurationMs = tonumber(ARGV[4])

if redis.call("EXISTS", blockKey) == 1 then
  return { limit + 1, -1, redis.call("PTTL", blockKey), 1 }
end

local hits = redis.call("HINCRBY", key, throttlerName, 1)

if redis.call("PTTL", key) <= 0 and ttlMs > 0 then
  redis.call("PEXPIRE", key, ttlMs)
end

if hits <= limit then
  return { hits, redis.call("PTTL", key), -1, 0 }
end

if blockDurationMs > 0 then
  redis.call("SET", blockKey, "1", "PX", blockDurationMs)
  return { hits, redis.call("PTTL", key), blockDurationMs, 1 }
end

return { hits, redis.call("PTTL", key), -1, 0 }
`.trim();

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly prefix = '_throttler';

  constructor(private readonly client: RedisClientLike) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redisKey = `${this.prefix}:${key}`;
    const blockKey = `${redisKey}:block:${throttlerName}`;

    const [totalHits, timeToExpireMs, timeToBlockExpireMs, isBlocked] =
      (await this.client.eval(LUA_SCRIPT, {
        keys: [redisKey, blockKey],
        arguments: [throttlerName, ttl.toString(), limit.toString(), blockDuration.toString()],
      })) as [number, number, number, number];

    return {
      totalHits,
      timeToExpire: timeToExpireMs > 0 ? Math.ceil(timeToExpireMs / 1000) : -1,
      isBlocked: isBlocked === 1,
      timeToBlockExpire: timeToBlockExpireMs > 0 ? Math.ceil(timeToBlockExpireMs / 1000) : -1,
    };
  }
}
