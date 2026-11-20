import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { secondsUntil } from '../../common/utils/time.js';
import { REDIS } from '../../infrastructure/redis/redis.module.js';
import {
  REVOKED_SESSION_MARKER,
  SESSION_CACHE_PREFIX,
} from '../constants/session-cache.constants.js';
import {
  type ActiveSession,
  activeSessionSchema,
  type RevokedSession,
} from '../types/session.types.js';

export type CachedSession = ActiveSession | 'revoked' | null;

@Injectable()
export class SessionCacheService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async get(id: string): Promise<CachedSession> {
    const value = await this.redis.get(this.key(id));
    if (value === null) return null;
    if (value === REVOKED_SESSION_MARKER) return 'revoked';

    const parsed = activeSessionSchema.safeParse(JSON.parse(value));
    return parsed.success && parsed.data.id === id ? parsed.data : null;
  }

  async set(session: ActiveSession, ttlSeconds: number): Promise<void> {
    await this.redis.set(
      this.key(session.id),
      JSON.stringify(session),
      'EX',
      ttlSeconds,
    );
  }

  async replaceExisting(sessions: ActiveSession[]): Promise<void> {
    if (sessions.length === 0) return;
    const pipeline = this.redis.pipeline();
    for (const session of sessions) {
      pipeline.set(
        this.key(session.id),
        JSON.stringify(session),
        'KEEPTTL',
        'XX',
      );
    }
    await pipeline.exec();
  }

  async markRevoked(sessions: RevokedSession[]): Promise<void> {
    if (sessions.length === 0) return;
    const pipeline = this.redis.pipeline();
    for (const { id, expiresAt } of sessions) {
      const remaining = secondsUntil(expiresAt);
      if (remaining > 0)
        pipeline.set(this.key(id), REVOKED_SESSION_MARKER, 'EX', remaining);
      else pipeline.del(this.key(id));
    }
    await pipeline.exec();
  }

  private key(id: string) {
    return `${SESSION_CACHE_PREFIX}${id}`;
  }
}
