import {
  DynamicModule,
  FactoryProvider,
  Injectable,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { createClient, createCluster, createSentinel } from 'redis';
import { RedisModuleAsyncOptions } from './interfaces';
import {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN,
} from './redis-client.module-definition';
import { RedisToken } from './redis-client.di-tokens';
import { RedisModuleForRootOptions, RedisModuleOptions } from './redis-client.types';

type RedisInstance =
  | ReturnType<typeof createClient>
  | ReturnType<typeof createCluster>
  | ReturnType<typeof createSentinel>;

const REDIS_LIFECYCLE_SERVICE = Symbol('REDIS_LIFECYCLE_SERVICE');

@Injectable()
class RedisLifecycleService implements OnApplicationShutdown {
  constructor(private readonly client: RedisInstance) {}

  async onApplicationShutdown() {
    try {
      await this.client?.quit();
    } catch {
      // client may not have been initialized (e.g. connect failed)
    }
  }
}

@Module({})
export class RedisModule extends ConfigurableModuleClass {
  private static readonly logger = new Logger('RedisModule');

  public static forRoot(
    options: RedisModuleForRootOptions = {},
  ): DynamicModule {
    const baseModule = super.forRoot(options);

    return {
      global: options?.isGlobal ?? false,
      module: RedisModule,
      providers: [
        ...(baseModule.providers || []),
        this.getRedisClientProvider(options?.connectionName),
        this.getLifecycleServiceProvider(options?.connectionName),
      ],
      exports: [RedisToken(options?.connectionName)],
    };
  }

  public static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
    const baseModule = super.forRootAsync(options);

    return {
      global: options.isGlobal ?? false,
      module: RedisModule,
      imports: options.imports || [],
      providers: [
        ...(baseModule.providers || []),
        this.getRedisClientProvider(options.connectionName),
        this.getLifecycleServiceProvider(options.connectionName),
      ],
      exports: [RedisToken(options.connectionName)],
    };
  }

  private static getLifecycleServiceProvider(connectionName?: string): FactoryProvider {
    return {
      provide: REDIS_LIFECYCLE_SERVICE,
      useFactory: (client: RedisInstance) => new RedisLifecycleService(client),
      inject: [RedisToken(connectionName)],
    };
  }

  private static getRedisClientProvider(
    connectionName?: string,
  ): FactoryProvider {
    return {
      provide: RedisToken(connectionName),
      useFactory: async (
        config: RedisModuleOptions,
      ): Promise<RedisInstance> => {
        function getClient(): RedisInstance {
          switch (config?.type) {
            case 'client':
            case undefined:
              return createClient(config?.options);
            case 'cluster':
              return createCluster(config.options);
            case 'sentinel':
              return createSentinel(config.options);
          }
        }

        function addListeners(
          client: RedisInstance,
          connectionName?: string,
        ): void {
          client.on('connect', () => {
            RedisModule.log(
              `[Event=connect] Connection initiated to Redis server`,
              connectionName,
            );
          });

          client.on('ready', () => {
            RedisModule.log(
              `[Event=ready] Redis client is ready to accept commands`,
              connectionName,
            );
          });

          client.on('end', () => {
            RedisModule.log(
              `[Event=end] Connection closed (disconnected from Redis server)`,
              connectionName,
            );
          });

          client.on('reconnecting', () => {
            RedisModule.log(
              `[Event=reconnecting] Attempting to reconnect to Redis server`,
              connectionName,
            );
          });

          client.on('error', (err) => {
            RedisModule.err(
              `[Event=error] Redis connection error (network issue): ${err.message}`,
              connectionName,
            );
          });
        }

        RedisModule.log(`Creating Redis client...`, connectionName);
        const client = getClient();
        addListeners(client, connectionName);
        RedisModule.log(`Connecting to Redis...`, connectionName);
        client.connect().catch((err: Error) => {
          RedisModule.err(`Failed to connect: ${err.message}`, connectionName);
        });
        return client;
      },
      inject: [MODULE_OPTIONS_TOKEN],
    };
  }

  private static log(
    message: string,
    connectionName: string | undefined = '<empty>',
  ): void {
    if (process.env['REDIS_MODULE_DEBUG'] !== 'true') return;

    this.logger.log(`[Connection=${connectionName}]: ${message}`);
  }

  private static err(
    message: string,
    connectionName: string | undefined = '<empty>',
  ): void {
    this.logger.error(`[Connection=${connectionName}]: ${message}`);
  }
}
