import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  daysFromNow,
  secondsFromNow,
  secondsUntil,
} from '../../common/utils/time.js';
import { AppConfigService } from '../../common/app-config/app-config.service.js';
import type { Permission } from '../../users/constants/permissions.js';
import { UsersService } from '../../users/services/users.service.js';
import { SessionsRepository } from '../repositories/sessions.repository.js';
import { toSessionView } from '../mappers/session.mapper.js';
import type {
  ActiveSession,
  IssuedSession,
  RotationResult,
  SessionMeta,
  SessionView,
} from '../types/session.types.js';
import { SessionCacheService } from './session-cache.service.js';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessions: SessionsRepository,
    private readonly cache: SessionCacheService,
    private readonly users: UsersService,
    private readonly config: AppConfigService,
  ) {}

  async create(
    userId: string,
    permissions: Permission[],
    meta: SessionMeta,
  ): Promise<IssuedSession> {
    const ttlSeconds = this.config.get('SESSION_TTL_SECONDS');
    const session: ActiveSession = { id: randomUUID(), userId, permissions };
    const expiresAt = secondsFromNow(ttlSeconds);
    await this.sessions.create({
      id: session.id,
      userId,
      ip: meta.ip,
      userAgent: meta.userAgent?.slice(0, 512),
      expiresAt,
      retainUntil: daysFromNow(this.config.get('SESSION_RETENTION_DAYS')),
    });
    await this.cache.setActive(session, ttlSeconds);
    return {
      session,
      refresh: { sessionId: session.id, userId, generation: 0, expiresAt },
    };
  }

  async rotate(sessionId: string, generation: number): Promise<RotationResult> {
    const refresh = await this.sessions.advanceRefreshGeneration(
      sessionId,
      generation,
    );
    if (refresh) {
      const session = await this.resolve(sessionId);
      return session
        ? { status: 'rotated', session, refresh }
        : { status: 'invalid' };
    }

    const existing = await this.sessions.findById(sessionId);
    if (
      !existing ||
      existing.revokedAt ||
      generation >= existing.refreshGeneration
    )
      return { status: 'invalid' };

    const expiresAt = await this.sessions.revokeById(sessionId);
    if (expiresAt) await this.cache.markRevoked([{ id: sessionId, expiresAt }]);
    return { status: 'reused', sessionId, userId: existing.userId };
  }

  async resolve(id: string): Promise<ActiveSession | null> {
    const cached = await this.cache.get(id);
    if (cached === 'revoked') return null;
    if (cached) return cached;

    const session = await this.sessions.findById(id);
    if (!session) return null;

    const remaining = secondsUntil(session.expiresAt);
    if (remaining <= 0) return null;

    const user = session.revokedAt
      ? null
      : await this.users.findById(session.userId);
    if (!user) {
      await this.cache.markRevoked([{ id, expiresAt: session.expiresAt }]);
      return null;
    }

    const active: ActiveSession = {
      id,
      userId: user.id,
      permissions: user.permissions,
    };
    // A concurrent revocation wins over this repopulation; fail closed.
    const stored = await this.cache.setActive(active, remaining);
    return stored ? active : null;
  }

  async listForUser(userId: string, currentId: string): Promise<SessionView[]> {
    const sessions = await this.sessions.findActiveByUser(userId);
    return sessions.map((session) => toSessionView(session, currentId));
  }

  async revoke(userId: string, id: string): Promise<void> {
    const expiresAt = await this.sessions.revoke(userId, id);
    if (!expiresAt) throw new NotFoundException('Session not found');
    await this.cache.markRevoked([{ id, expiresAt }]);
  }

  async revokeOthers(
    userId: string,
    currentId: string,
  ): Promise<{ revoked: number }> {
    const revoked = await this.sessions.revokeActiveExcept(userId, currentId);
    await this.cache.markRevoked(revoked);
    return { revoked: revoked.length };
  }

  async refreshPermissions(
    userId: string,
    permissions: Permission[],
  ): Promise<void> {
    const active = await this.sessions.findActiveByUser(userId);
    await this.cache.replaceExisting(
      active.map(({ id }) => ({ id, userId, permissions })),
    );
  }
}
