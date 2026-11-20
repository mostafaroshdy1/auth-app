import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { secondsUntil } from '../../common/utils/time.js';
import { REDIS } from '../../infrastructure/redis/redis.module.js';
import {
  REPLACE_ACTIVE_IF_NOT_REVOKED_SCRIPT,
  SET_ACTIVE_IF_NOT_REVOKED_SCRIPT,
} from '../../infrastructure/redis/scripts/session-cache.script.js';
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

  async setActive(
    session: ActiveSession,
    ttlSeconds: number,
  ): Promise<boolean> {
    const result = await this.redis.eval(
      SET_ACTIVE_IF_NOT_REVOKED_SCRIPT,
      1,
      this.key(session.id),
      JSON.stringify(session),
      ttlSeconds,
      REVOKED_SESSION_MARKER,
    );
    return Number(result) === 1;
  }

  async replaceExisting(sessions: ActiveSession[]): Promise<void> {
    if (sessions.length === 0) return;
    const pipeline = this.redis.pipeline();
    for (const session of sessions) {
      pipeline.eval(
        REPLACE_ACTIVE_IF_NOT_REVOKED_SCRIPT,
        1,
        this.key(session.id),
        JSON.stringify(session),
        REVOKED_SESSION_MARKER,
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
