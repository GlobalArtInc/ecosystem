import { Controller, Get } from "@nestjs/common";
import { InjectRedis } from "@globalart/nestjs-redis";
import type { RedisSentinelType } from "redis";

@Controller()
export class AppController {
  constructor(
    @InjectRedis() private readonly redis: RedisSentinelType,
  ) {}

  @Get()
  async test() {
    await this.redis.set('test', 'value');
    const value = await this.redis.get('test');
    return { value };
  }
}
