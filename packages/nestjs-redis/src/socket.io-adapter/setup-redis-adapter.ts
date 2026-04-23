import type { INestApplication } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { UnknownElementException } from '@nestjs/core/errors/exceptions';
import { RedisToken } from '../client/redis-client.di-tokens.js';
import { RedisAdapterAlreadySetUpException, RedisClientNotFoundException } from './exceptions.js';
import { RedisIoAdapter } from './redis-io.adapter.js';

const initializedApps = new WeakSet<INestApplication>();

export async function setupRedisAdapter(
  app: INestApplication,
  connectionName?: string,
): Promise<void> {
  if (initializedApps.has(app)) {
    throw new RedisAdapterAlreadySetUpException();
  }

  const token = RedisToken(connectionName);
  const adapter = new RedisIoAdapter(app);

  try {
    const moduleRef = app.get(ModuleRef);
    const redisClient = moduleRef.get(token, { strict: false });
    await adapter.connectToRedis(redisClient);
    app.useWebSocketAdapter(adapter);
    initializedApps.add(app);
  } catch (err) {
    if (err instanceof UnknownElementException) {
      throw new RedisClientNotFoundException(connectionName);
    }
    throw err;
  }
}
