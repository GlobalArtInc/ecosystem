import { Inject, Logger } from '@nestjs/common';
import { LockNotAcquiredError } from './core/errors.js';
import { RedlockService } from './redlock.service.js';

const logger = new Logger('Redlock');

// Stable property key independent of class name (survives minification)
const REDLOCK_SERVICE_PROP = '__redlock_service__' as const;

export interface RedlockDecoratorOptions {
  /** Lock TTL in milliseconds (default: 30_000) */
  ttl?: number;
  /**
   * When true, execute the method even if the lock cannot be acquired
   * (e.g. Redis unavailable). Useful for dev/staging environments.
   * Default: false.
   */
  failOpen?: boolean;
}

export function Redlock(
  key: string | string[],
  options: RedlockDecoratorOptions | number = {},
): MethodDecorator {
  const ttl = typeof options === 'number' ? options : (options.ttl ?? 30_000);
  const failOpen = typeof options === 'number' ? false : (options.failOpen ?? false);
  const keys = Array.isArray(key) ? key : [key];

  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error(
        `@Redlock can only be applied to methods, not to "${String(propertyKey)}"`,
      );
    }

    Inject(RedlockService)(target, REDLOCK_SERVICE_PROP);

    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    const wrappedMethod = async function (this: Record<string, unknown>, ...args: unknown[]) {
      const redlockService = this[REDLOCK_SERVICE_PROP] as RedlockService | undefined;

      if (!redlockService) {
        throw new Error(
          `@Redlock: RedlockService not injected on "${String(propertyKey)}". ` +
            `Ensure RedlockModule is imported (or isGlobal: true).`,
        );
      }

      try {
        return await redlockService.withLock(keys, ttl, () =>
          originalMethod.apply(this, args) as Promise<unknown>,
        );
      } catch (err) {
        if (err instanceof LockNotAcquiredError) {
          if (failOpen) {
            logger.warn(
              `Lock not acquired for "${String(propertyKey)}" — running anyway (failOpen=true)`,
            );
            return originalMethod.apply(this, args);
          }
          logger.debug(`Skipped "${String(propertyKey)}": ${err.message}`);
          return undefined;
        }
        throw err;
      }
    };

    Object.defineProperty(wrappedMethod, 'name', {
      value: originalMethod.name,
      configurable: true,
    });
    Object.defineProperty(wrappedMethod, 'length', {
      value: originalMethod.length,
      configurable: true,
    });

    // Copy Reflect metadata so decorators like @Cron applied after @Redlock still work
    for (const mk of Reflect.getMetadataKeys(originalMethod)) {
      Reflect.defineMetadata(mk, Reflect.getMetadata(mk, originalMethod), wrappedMethod);
    }

    descriptor.value = wrappedMethod;
    return descriptor;
  };
}
