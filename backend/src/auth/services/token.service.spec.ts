import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { testConfig } from '../../common/testing/test-config.js';
import { secondsFromNow } from '../../common/utils/time.js';
import { TokenService } from './token.service.js';

describe('TokenService', () => {
  const tokens = new TokenService(new JwtService(), testConfig());
  const sessionId = randomUUID();
  const issue = () =>
    tokens.issue(
      { id: sessionId, userId: 'u1', permissions: [] },
      {
        sessionId,
        userId: 'u1',
        generation: 3,
        expiresAt: secondsFromNow(3600),
      },
    );

  it('round-trips access and refresh tokens', async () => {
    const { accessToken, refreshToken } = await issue();
    await expect(tokens.verifyAccess(accessToken)).resolves.toMatchObject({
      sub: 'u1',
      jti: sessionId,
    });
    await expect(tokens.verifyRefresh(refreshToken)).resolves.toMatchObject({
      sub: 'u1',
      jti: sessionId,
      gen: 3,
    });
  });

  it('never accepts one token type as the other', async () => {
    const { accessToken, refreshToken } = await issue();
    await expect(tokens.verifyAccess(refreshToken)).resolves.toBeNull();
    await expect(tokens.verifyRefresh(accessToken)).resolves.toBeNull();
  });

  it('rejects tampered tokens', async () => {
    const { accessToken } = await issue();
    await expect(tokens.verifyAccess(`${accessToken}x`)).resolves.toBeNull();
  });
});
