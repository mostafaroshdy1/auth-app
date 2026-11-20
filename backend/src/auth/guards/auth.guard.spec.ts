import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { testConfig } from '../../common/testing/test-config.js';
import { secondsFromNow } from '../../common/utils/time.js';
import type { SessionsService } from '../../sessions/services/sessions.service.js';
import type { ActiveSession } from '../../sessions/types/session.types.js';
import { Permission } from '../../users/constants/permissions.js';
import { IS_PUBLIC } from '../decorators/public.decorator.js';
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.decorator.js';
import { SessionCookieService } from '../services/session-cookie.service.js';
import { TokenService } from '../services/token.service.js';
import { AuthGuard } from './auth.guard.js';

const config = testConfig();
const tokens = new TokenService(new JwtService(), config);
const cookies = new SessionCookieService(config, {} as HttpAdapterHost);

function setup(
  metadata: Record<string, unknown>,
  session: ActiveSession | null,
) {
  const reflector = {
    getAllAndOverride: vi.fn((key: string) => metadata[key]),
  } as unknown as Reflector;
  const sessions = {
    resolve: vi.fn().mockResolvedValue(session),
  } as unknown as SessionsService;
  return new AuthGuard(reflector, tokens, sessions, cookies);
}

function contextWith(cookie?: string) {
  const request: Record<string, unknown> = { headers: { cookie } };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

const issueFor = (sub: string, id: string) =>
  tokens.issue(
    { id, userId: sub, permissions: [] },
    {
      sessionId: id,
      userId: sub,
      generation: 0,
      expiresAt: secondsFromNow(3600),
    },
  );

describe('AuthGuard', () => {
  const sessionId = randomUUID();
  const session: ActiveSession = {
    id: sessionId,
    userId: 'u1',
    permissions: [Permission.UsersRead],
  };
  const accessCookie = async (sub = 'u1') =>
    `__Host-access=${(await issueFor(sub, sessionId)).accessToken}`;

  it('lets public routes through without a cookie', async () => {
    await expect(
      setup({ [IS_PUBLIC]: true }, null).canActivate(contextWith().context),
    ).resolves.toBe(true);
  });

  it('rejects requests without an access cookie', async () => {
    await expect(
      setup({}, session).canActivate(contextWith().context),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a refresh token presented as an access token', async () => {
    const { refreshToken } = await issueFor('u1', sessionId);
    const { context } = contextWith(`__Host-access=${refreshToken}`);
    await expect(setup({}, session).canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a revoked session', async () => {
    const { context } = contextWith(await accessCookie());
    await expect(setup({}, null).canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token whose subject does not own the session', async () => {
    const { context } = contextWith(await accessCookie('u2'));
    await expect(setup({}, session).canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('attaches the session to the request', async () => {
    const { context, request } = contextWith(
      `other=1; ${await accessCookie()}`,
    );
    await expect(setup({}, session).canActivate(context)).resolves.toBe(true);
    expect(request.session).toEqual(session);
  });

  it('enforces required permissions', async () => {
    const { context } = contextWith(await accessCookie());
    const guard = setup(
      { [REQUIRED_PERMISSIONS]: [Permission.UsersManage] },
      session,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
