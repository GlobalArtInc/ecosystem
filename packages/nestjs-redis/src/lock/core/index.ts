/**
 * @fileoverview Redis-based distributed lock library for Node.js
 *
 * Provides distributed locking using the Redlock algorithm with automatic lifecycle management.
 *
 * @example Basic usage with automatic lock management
 * ```typescript
 * import { createClient } from 'redis';
 * import { Redlock } from '@redis-kit/lock';
 *
 * const clients = [createClient(), createClient(), createClient()];
 * await Promise.all(clients.map(client => client.connect()));
 *
 * const redlock = new Redlock(clients);
 *
 * // Automatic lock management - recommended approach
 * const result = await redlock.withLock('my-resource', 30000, async () => {
 *   // Your critical section code here
 *   return 'work completed';
 * });
 * ```
 *
 * @example Manual lock management
 * ```typescript
 * const lock = await redlock.acquire('my-resource', 30000);
 * if (lock) {
 *   try {
 *     // Your critical section code here
 *   } finally {
 *     await lock.release();
 *   }
 * }
 * ```
 *
 * @example Multi-resource locking
 * ```typescript
 * // Lock multiple resources atomically
 * await redlock.withLock(['user:123', 'order:456'], 30000, async () => {
 *   // All resources are locked together
 * });
 * ```
 *
 * @packageDocumentation
 */

// Distributed lock implementation (Redlock algorithm)
export { Redlock, type RedlockInstance } from './redlock.js';
export type { RedlockOptions } from './types.js';

// Common error classes
export { RedisConnectionError, InvalidParameterError } from './errors.js';
