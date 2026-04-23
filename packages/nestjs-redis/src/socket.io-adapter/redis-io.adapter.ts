import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { RedisClientType } from 'redis';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private subClient: RedisClientType | undefined;
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;

  async connectToRedis(pubClient: RedisClientType): Promise<void> {
    this.subClient = pubClient.duplicate();

    try {
      await this.subClient.connect();
    } catch (err) {
      this.logger.error(
        `Failed to connect Redis sub-client: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }

    this.adapterConstructor = createAdapter(pubClient, this.subClient);
  }

  override createIOServer(
    port: number,
    options?: Parameters<IoAdapter['createIOServer']>[1],
  ): ReturnType<IoAdapter['createIOServer']> {
    const server = super.createIOServer(port, options);
    if (!this.adapterConstructor) {
      throw new Error('RedisIoAdapter: connectToRedis() must be called before createIOServer()');
    }
    server.adapter(this.adapterConstructor);
    return server;
  }

  override async close(server: Parameters<IoAdapter['close']>[0]): Promise<void> {
    await super.close(server);
    try {
      await this.subClient?.quit();
    } catch (err) {
      this.logger.warn(
        `Error closing Redis sub-client: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
