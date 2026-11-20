import { Inject, Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { REDIS } from './redis.module.js';
import {
  THROTTLE_SCRIPT,
  throttleScriptResult,
} from './scripts/throttle.script.js';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): ReturnType<ThrottlerStorage['increment']> {
    const prefix = `throttle:${throttlerName}:${key}`;
    const [totalHits, hitsTtl, blocked, blockTtl] = throttleScriptResult.parse(
      await this.redis.eval(
        THROTTLE_SCRIPT,
        2,
        `${prefix}:hits`,
        `${prefix}:block`,
        ttl,
        limit,
        blockDuration,
      ),
    );

    return {
      totalHits,
      timeToExpire: Math.max(0, Math.ceil(hitsTtl / 1000)),
      isBlocked: blocked === 1,
      timeToBlockExpire: Math.max(0, Math.ceil(blockTtl / 1000)),
    };
  }
}
