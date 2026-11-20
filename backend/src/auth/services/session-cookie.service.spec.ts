import type { HttpAdapterHost } from '@nestjs/core';
import { testConfig } from '../../common/testing/test-config.js';
import { secondsFromNow } from '../../common/utils/time.js';
import { SessionCookieService } from './session-cookie.service.js';

function setup(secure: boolean) {
  const httpAdapter = { setCookie: vi.fn(), clearCookie: vi.fn() };
  const service = new SessionCookieService(
    testConfig({ COOKIE_SECURE: secure }),
    { httpAdapter } as unknown as HttpAdapterHost,
  );
  return { service, httpAdapter };
}

describe('SessionCookieService', () => {
  it('sets a __Host- access cookie and a path-scoped __Secure- refresh cookie', () => {
    const { service, httpAdapter } = setup(true);
    service.set('res', {
      accessToken: 'a',
      refreshToken: 'r',
      refreshExpiresAt: secondsFromNow(3600),
    });

    expect(httpAdapter.setCookie).toHaveBeenCalledWith(
      'res',
      '__Host-access',
      'a',
      {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: 900,
      },
    );
    expect(httpAdapter.setCookie).toHaveBeenCalledWith(
      'res',
      '__Secure-refresh',
      'r',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/api/auth/refresh',
      }),
    );
  });

  it('reads each token from its own cookie', () => {
    const { service } = setup(true);
    const request = {
      headers: { cookie: 'access=x; __Host-access=a; __Secure-refresh=r' },
    };
    expect(service.readAccessToken(request)).toBe('a');
    expect(service.readRefreshToken(request)).toBe('r');
  });

  it('clears both cookies and drops the prefixes when secure cookies are off', () => {
    const { service, httpAdapter } = setup(false);
    service.clear('res');
    expect(httpAdapter.clearCookie).toHaveBeenCalledWith(
      'res',
      'access',
      expect.objectContaining({ path: '/' }),
    );
    expect(httpAdapter.clearCookie).toHaveBeenCalledWith(
      'res',
      'refresh',
      expect.objectContaining({ path: '/api/auth/refresh' }),
    );
  });
});
