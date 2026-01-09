import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { InjectRedis } from "@globalart/nestjs-redis";
import { Redis } from "ioredis";
import { AbstractDaemon } from "./abstract.daemon";
import { DAEMON_MODULE_OPTIONS } from "./constants/daemon.constants";
import { DaemonOptions } from "./interfaces/daemon.interfaces";

@Injectable()
export class DaemonService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DaemonService.name);
  private worker!: AbstractDaemon;
  private isRunning = false;
  private isDestroyed = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(DAEMON_MODULE_OPTIONS) private readonly options: DaemonOptions,
    @InjectRedis() private readonly redis: Redis,
    private readonly moduleRef: ModuleRef
  ) {}

  async onModuleInit() {
    this.worker = this.moduleRef.get(this.options.worker, { strict: false });

    if (this.options.runOnStart) {
      await this.start();
    } else {
      // Check Redis state in case we should be running
      const shouldRun = await this.shouldRunFromRedis();
      if (shouldRun) {
        await this.start();
      }
    }
  }

  async onModuleDestroy() {
    this.isDestroyed = true;
    await this.stop();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log(`Starting daemon: ${this.options.name}`);
    await this.worker.onStart();
    this.loop();
  }

  async stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.log(`Stopping daemon: ${this.options.name}`);
    await this.worker.onStop();
  }

  private async loop() {
    if (this.isDestroyed || !this.isRunning) return;

    try {
      // 1. Check control flags from Redis
      const control = await this.getControlState();

      if (control === "PAUSE" || control === "STOP") {
        if (control === "STOP") {
          await this.stop();
          return;
        }
        // If PAUSED, just wait a bit and retry
        this.timer = setTimeout(() => this.loop(), 5000);
        return;
      }

      // 2. Perform Task
      const start = Date.now();
      await this.worker.perform();
      const duration = Date.now() - start;

      // 3. Update Stats
      await this.updateHeartbeat();

      // 4. Calculate Delay
      const interval = await this.getInterval();
      const delay = Math.max(0, interval - duration); // Ensure we don't drift if execution is fast

      // If execution took longer than interval, run immediately (or throttle?)
      // User requirement "1 contact in 30sec" usually means "start next 30s after previous started" or "wait 30s after finish".
      // Let's assume "Wait X ms after finish" for safety, or "Fixed Rate".
      // Implementation here: Fixed Delay (wait interval after finish) is safest for single threaded.
      // But "1 contact in 30sec" implies Rate Limiting.
      // Let's use simple delay for now.

      this.timer = setTimeout(() => this.loop(), Math.max(100, interval));
    } catch (err) {
      await this.worker.onError(err as Error);
      const retryDelay = await this.getRetryDelay();
      this.timer = setTimeout(() => this.loop(), retryDelay);
    }
  }

  private get redisKeyPrefix() {
    return `daemon:${this.options.name}`;
  }

  private async getControlState(): Promise<string | null> {
    return this.redis.get(`${this.redisKeyPrefix}:control`);
  }

  private async shouldRunFromRedis(): Promise<boolean> {
    const state = await this.getControlState();
    return state === "START";
  }

  private async getInterval(): Promise<number> {
    const fromRedis = await this.redis.get(`${this.redisKeyPrefix}:interval`);
    if (fromRedis) return parseInt(fromRedis, 10);
    return this.options.defaultInterval || 1000;
  }

  private async getRetryDelay(): Promise<number> {
    const fromRedis = await this.redis.get(`${this.redisKeyPrefix}:retryDelay`);
    if (fromRedis) return parseInt(fromRedis, 10);
    return 5000;
  }

  private async updateHeartbeat() {
    await this.redis.set(
      `${this.redisKeyPrefix}:heartbeat`,
      Date.now(),
      "EX",
      60
    );
  }
}
