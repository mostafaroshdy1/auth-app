import { testConfig } from '../../common/testing/test-config.js';
import { secondsFromNow } from '../../common/utils/time.js';
import { Permission } from '../../users/constants/permissions.js';
import type { UsersService } from '../../users/services/users.service.js';
import type { User } from '../../users/types/user.types.js';
import type { SessionsRepository } from '../repositories/sessions.repository.js';
import type { ActiveSession, Session } from '../types/session.types.js';
import type { SessionCacheService } from './session-cache.service.js';
import { SessionsService } from './sessions.service.js';

const sessionId = 'session-1';
const userId = 'user-1';

const session: Session = {
  id: sessionId,
  userId,
  createdAt: new Date(),
  expiresAt: secondsFromNow(3600),
  refreshGeneration: 0,
};

const user: User = {
  id: userId,
  email: 'user@example.com',
  name: 'Test User',
  permissions: [Permission.UsersRead],
  createdAt: new Date(),
};

function setup() {
  const sessions = {
    create: vi.fn(),
    findById: vi.fn(),
    advanceRefreshGeneration: vi.fn(),
    revoke: vi.fn(),
    revokeById: vi.fn(),
    revokeActiveExcept: vi.fn(),
    findActiveByUser: vi.fn(),
  };
  const cache = {
    get: vi.fn(),
    setActive: vi.fn(),
    replaceExisting: vi.fn(),
    markRevoked: vi.fn(),
  };
  const users = { findById: vi.fn() };
  const service = new SessionsService(
    sessions as unknown as SessionsRepository,
    cache as unknown as SessionCacheService,
    users as unknown as UsersService,
    testConfig(),
  );
  return { service, sessions, cache, users };
}

describe('SessionsService.resolve', () => {
  it('returns a cached active session without hitting the database', async () => {
    const { service, sessions, cache, users } = setup();
    const active: ActiveSession = { id: sessionId, userId, permissions: [] };
    cache.get.mockResolvedValue(active);

    await expect(service.resolve(sessionId)).resolves.toEqual(active);
    expect(sessions.findById).not.toHaveBeenCalled();
    expect(users.findById).not.toHaveBeenCalled();
    expect(cache.setActive).not.toHaveBeenCalled();
  });

  it('returns null for a revoked cached session', async () => {
    const { service, cache } = setup();
    cache.get.mockResolvedValue('revoked');

    await expect(service.resolve(sessionId)).resolves.toBeNull();
  });

  it('repopulates the cache from the database', async () => {
    const { service, sessions, cache, users } = setup();
    cache.get.mockResolvedValue(null);
    sessions.findById.mockResolvedValue(session);
    users.findById.mockResolvedValue(user);
    cache.setActive.mockResolvedValue(true);

    await expect(service.resolve(sessionId)).resolves.toEqual({
      id: sessionId,
      userId,
      permissions: user.permissions,
    });
    expect(cache.setActive).toHaveBeenCalledWith(
      { id: sessionId, userId, permissions: user.permissions },
      expect.any(Number),
    );
    const ttl = cache.setActive.mock.calls[0]?.[1] as number;
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(3600);
  });

  it('does not return a session when the cache refuses the repopulation', async () => {
    const { service, sessions, cache, users } = setup();
    cache.get.mockResolvedValue(null);
    sessions.findById.mockResolvedValue(session);
    users.findById.mockResolvedValue(user);
    cache.setActive.mockResolvedValue(false);

    await expect(service.resolve(sessionId)).resolves.toBeNull();
  });

  it('returns null for an expired session', async () => {
    const { service, sessions, cache } = setup();
    cache.get.mockResolvedValue(null);
    sessions.findById.mockResolvedValue({
      ...session,
      expiresAt: secondsFromNow(-1),
    });

    await expect(service.resolve(sessionId)).resolves.toBeNull();
    expect(cache.setActive).not.toHaveBeenCalled();
  });

  it('marks a session revoked when the user no longer exists', async () => {
    const { service, sessions, cache, users } = setup();
    cache.get.mockResolvedValue(null);
    sessions.findById.mockResolvedValue(session);
    users.findById.mockResolvedValue(null);

    await expect(service.resolve(sessionId)).resolves.toBeNull();
    expect(cache.markRevoked).toHaveBeenCalledWith([
      { id: sessionId, expiresAt: session.expiresAt },
    ]);
  });
});

describe('SessionsService.rotate', () => {
  it('reports invalid when the session is revoked while resolving', async () => {
    const { service, sessions, cache, users } = setup();
    sessions.advanceRefreshGeneration.mockResolvedValue({
      sessionId,
      userId,
      generation: 1,
      expiresAt: session.expiresAt,
    });
    cache.get.mockResolvedValue(null);
    sessions.findById.mockResolvedValue(session);
    users.findById.mockResolvedValue(user);
    cache.setActive.mockResolvedValue(false);

    await expect(service.rotate(sessionId, 0)).resolves.toEqual({
      status: 'invalid',
    });
  });
});

describe('SessionsService.create', () => {
  it('caches the new session as active', async () => {
    const { service, sessions, cache } = setup();
    sessions.create.mockResolvedValue(undefined);
    cache.setActive.mockResolvedValue(true);

    const { session: created } = await service.create(
      userId,
      [Permission.UsersRead],
      {},
    );

    expect(created).toMatchObject({
      userId,
      permissions: [Permission.UsersRead],
    });
    expect(cache.setActive).toHaveBeenCalledWith(created, 3600);
  });
});
