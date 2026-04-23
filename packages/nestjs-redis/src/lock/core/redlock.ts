import type { RedisClientType } from 'redis';
import { InvalidParameterError, LockNotAcquiredError } from './errors.js';
import { ACQUIRE_SCRIPT, EXTEND_SCRIPT, RELEASE_SCRIPT } from './lua-scripts.js';
import { generateToken } from './token.js';
import type { RedlockOptions } from './types.js';

const INTERNAL = Symbol('redlock-internal');

interface RedlockInternal {
  release(keys: string[], token: string): Promise<boolean>;
  extend(keys: string[], token: string, ttlMs: number): Promise<boolean>;
}

function normalizeKeys(input: string | string[]): string[] {
  const arr = Array.isArray(input) ? input : [input];
  if (arr.length === 0) {
    throw new InvalidParameterError('keys', arr, 'non-empty array of strings');
  }
  const validated = arr.map((k, i) => {
    if (!k || typeof k !== 'string' || !k.trim()) {
      throw new InvalidParameterError(`keys[${i}]`, k, 'non-empty string');
    }
    return k;
  });
  return [...new Set(validated)].sort();
}

export class RedlockInstance {
  private released = false;
  private extensionTimer: NodeJS.Timeout | undefined;
  private autoExtend = false;
  private readonly keys: string[];

  constructor(
    private readonly redlock: Redlock,
    keyOrKeys: string | string[],
    private readonly token: string,
    private expiresAt: Date,
    private readonly ttlMs: number,
  ) {
    this.keys = normalizeKeys(keyOrKeys);
  }

  get isReleased(): boolean { return this.released; }
  get isExpired(): boolean { return Date.now() > this.expiresAt.getTime(); }
  get isValid(): boolean { return !this.released && !this.isExpired; }
  get expirationTime(): Date { return new Date(this.expiresAt); }
  get resourceKeys(): string[] { return [...this.keys]; }

  async release(): Promise<boolean> {
    if (this.released) return true;
    this.released = true;
    this.stopAutoExtension();
    return this.redlock[INTERNAL].release(this.keys, this.token);
  }

  async extend(newTtlMs?: number): Promise<boolean> {
    if (this.released) throw new Error('Cannot extend a released lock');
    const ttl = newTtlMs ?? this.ttlMs;
    if (!Number.isInteger(ttl) || ttl <= 0) {
      throw new InvalidParameterError('newTtlMs', ttl, 'positive integer');
    }
    const success = await this.redlock[INTERNAL].extend(this.keys, this.token, ttl);
    if (success) {
      this.expiresAt = new Date(Date.now() + ttl);
    }
    return success;
  }

  startAutoExtension(thresholdMs = 1000): void {
    if (this.released) throw new Error('Cannot start auto-extension on a released lock');
    if (thresholdMs <= 0) {
      throw new InvalidParameterError('thresholdMs', thresholdMs, 'positive integer');
    }
    this.autoExtend = true;
    this.scheduleExtension(thresholdMs);
  }

  stopAutoExtension(): void {
    this.autoExtend = false;
    if (this.extensionTimer) {
      clearTimeout(this.extensionTimer);
      this.extensionTimer = undefined;
    }
  }

  private scheduleExtension(thresholdMs: number): void {
    if (!this.autoExtend || this.released) return;
    const delay = Math.max(0, this.expiresAt.getTime() - Date.now() - thresholdMs);
    this.extensionTimer = setTimeout(() => void this.performExtension(thresholdMs), delay);
  }

  private async performExtension(thresholdMs: number): Promise<void> {
    this.extensionTimer = undefined;
    if (!this.autoExtend || this.released) return;
    try {
      const success = await this.extend(this.ttlMs);
      if (success) {
        this.scheduleExtension(thresholdMs);
      } else {
        this.autoExtend = false;
      }
    } catch {
      this.autoExtend = false;
    }
  }
}

export class Redlock {
  [INTERNAL]: RedlockInternal;

  private readonly clients: RedisClientType[];
  private readonly quorum: number;
  private readonly driftFactor: number;
  private readonly retryDelayMs: number;
  private readonly retryJitterMs: number;
  private readonly maxRetryAttempts: number;
  private readonly acquireTimeoutMs: number;

  constructor(clients: RedisClientType[], options: RedlockOptions = {}) {
    if (!Array.isArray(clients) || clients.length === 0) {
      throw new InvalidParameterError('clients', clients, 'non-empty array of Redis clients');
    }
    this.clients = clients;
    this.quorum = Math.floor(clients.length / 2) + 1;
    this.driftFactor = options.driftFactor ?? 0.01;
    this.retryDelayMs = options.retryDelayMs ?? 200;
    this.retryJitterMs = options.retryJitterMs ?? 100;
    this.maxRetryAttempts = options.maxRetryAttempts ?? 3;
    this.acquireTimeoutMs = options.acquireTimeoutMs ?? 1000;

    this[INTERNAL] = {
      release: this.releaseKeys.bind(this),
      extend: this.extendKeys.bind(this),
    };
  }

  async acquire(key: string, ttlMs: number): Promise<RedlockInstance | null>;
  async acquire(keys: string[], ttlMs: number): Promise<RedlockInstance | null>;
  async acquire(keyOrKeys: string | string[], ttlMs: number): Promise<RedlockInstance | null> {
    return this.acquireInternal(keyOrKeys, ttlMs);
  }

  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
  async withLock<T>(keys: string[], ttlMs: number, fn: () => Promise<T>): Promise<T>;
  async withLock<T>(keyOrKeys: string | string[], ttlMs: number, fn: () => Promise<T>): Promise<T> {
    if (typeof fn !== 'function') {
      throw new InvalidParameterError('fn', fn, 'function');
    }
    const keys = normalizeKeys(keyOrKeys);
    const lock = await this.acquireInternal(keys, ttlMs);
    if (!lock) {
      throw new LockNotAcquiredError(keys);
    }
    try {
      return await fn();
    } finally {
      lock.stopAutoExtension();
      await lock.release();
    }
  }

  private async acquireInternal(
    keyOrKeys: string | string[],
    ttlMs: number,
  ): Promise<RedlockInstance | null> {
    const keys = normalizeKeys(keyOrKeys);
    this.validateTtl(ttlMs);

    for (let attempt = 0; attempt <= this.maxRetryAttempts; attempt++) {
      const token = generateToken();
      const start = Date.now();

      const results = await Promise.allSettled(
        this.clients.map((c) => this.acquireOnClient(c, keys, token, ttlMs)),
      );

      const successes = results.filter((r) => r.status === 'fulfilled' && r.value).length;
      const elapsed = Date.now() - start;
      const drift = Math.round(this.driftFactor * ttlMs);
      const validity = ttlMs - elapsed - drift;

      if (successes >= this.quorum && validity > 1) {
        return new RedlockInstance(this, keys, token, new Date(Date.now() + validity), ttlMs);
      }

      await Promise.allSettled(this.clients.map((c) => this.releaseOnClient(c, keys, token)));

      if (attempt < this.maxRetryAttempts) {
        await this.sleep(this.retryDelayMs + Math.random() * this.retryJitterMs);
      }
    }

    return null;
  }

  private async releaseKeys(keys: string[], token: string): Promise<boolean> {
    const results = await Promise.allSettled(
      this.clients.map((c) => this.releaseOnClient(c, keys, token)),
    );
    return results.some((r) => r.status === 'fulfilled' && r.value);
  }

  private async extendKeys(keys: string[], token: string, ttlMs: number): Promise<boolean> {
    this.validateTtl(ttlMs);
    const results = await Promise.allSettled(
      this.clients.map((c) => this.extendOnClient(c, keys, token, ttlMs)),
    );
    const successes = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    return successes >= this.quorum;
  }

  private async acquireOnClient(
    client: RedisClientType,
    keys: string[],
    token: string,
    ttlMs: number,
  ): Promise<boolean> {
    try {
      const result = await this.withTimeout(
        client.eval(ACQUIRE_SCRIPT, { keys, arguments: [token, ttlMs.toString()] }),
      );
      return result === 1;
    } catch {
      return false;
    }
  }

  private async releaseOnClient(
    client: RedisClientType,
    keys: string[],
    token: string,
  ): Promise<boolean> {
    try {
      const result = await this.withTimeout(
        client.eval(RELEASE_SCRIPT, { keys, arguments: [token] }),
      );
      return (result as number) > 0;
    } catch {
      return false;
    }
  }

  private async extendOnClient(
    client: RedisClientType,
    keys: string[],
    token: string,
    ttlMs: number,
  ): Promise<boolean> {
    try {
      const result = await this.withTimeout(
        client.eval(EXTEND_SCRIPT, { keys, arguments: [token, ttlMs.toString()] }),
      );
      return result === 1;
    } catch {
      return false;
    }
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis command timed out')), this.acquireTimeoutMs),
      ),
    ]);
  }

  private validateTtl(ttlMs: number): void {
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
      throw new InvalidParameterError('ttlMs', ttlMs, 'positive integer');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
