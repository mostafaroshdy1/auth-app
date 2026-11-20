import { type CookieSerializeOptions, Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppConfigService } from '../../common/app-config/app-config.service.js';
import { secondsUntil } from '../../common/utils/time.js';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
  SECURE_ACCESS_COOKIE,
  SECURE_REFRESH_COOKIE,
} from '../constants/session-cookie.constants.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';
import type { IssuedTokens } from '../types/token-payload.js';
import { readCookie } from '../utils/read-cookie.js';

type CookieRequest = Pick<AuthenticatedRequest, 'headers'>;

@Injectable()
export class SessionCookieService {
  constructor(
    private readonly config: AppConfigService,
    private readonly adapterHost: HttpAdapterHost,
  ) {}

  readAccessToken(request: CookieRequest) {
    return readCookie(request.headers.cookie, this.accessName);
  }

  readRefreshToken(request: CookieRequest) {
    return readCookie(request.headers.cookie, this.refreshName);
  }

  set(
    response: unknown,
    { accessToken, refreshToken, refreshExpiresAt }: IssuedTokens,
  ) {
    const adapter = this.adapterHost.httpAdapter;
    adapter.setCookie?.(response, this.accessName, accessToken, {
      ...this.accessOptions,
      maxAge: this.config.get('ACCESS_TOKEN_TTL_SECONDS'),
    });
    adapter.setCookie?.(response, this.refreshName, refreshToken, {
      ...this.refreshOptions,
      maxAge: secondsUntil(refreshExpiresAt),
    });
  }

  clear(response: unknown) {
    const adapter = this.adapterHost.httpAdapter;
    adapter.clearCookie?.(response, this.accessName, this.accessOptions);
    adapter.clearCookie?.(response, this.refreshName, this.refreshOptions);
  }

  private get secure() {
    return this.config.get('COOKIE_SECURE');
  }

  private get accessName() {
    return this.secure ? SECURE_ACCESS_COOKIE : ACCESS_COOKIE;
  }

  private get refreshName() {
    return this.secure ? SECURE_REFRESH_COOKIE : REFRESH_COOKIE;
  }

  private get accessOptions(): CookieSerializeOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict',
      path: '/',
    };
  }

  private get refreshOptions(): CookieSerializeOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    };
  }
}
