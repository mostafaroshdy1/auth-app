import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { z } from 'zod';
import { AppConfigService } from '../../common/app-config/app-config.service.js';
import { secondsUntil } from '../../common/utils/time.js';
import type {
  ActiveSession,
  RefreshState,
} from '../../sessions/types/session.types.js';
import {
  ACCESS_TOKEN_AUDIENCE,
  REFRESH_TOKEN_AUDIENCE,
  TOKEN_ALGORITHM,
  TOKEN_ISSUER,
} from '../constants/token.constants.js';
import {
  type AccessTokenPayload,
  accessTokenPayloadSchema,
  type IssuedTokens,
  type RefreshTokenPayload,
  refreshTokenPayloadSchema,
} from '../types/token-payload.js';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async issue(
    session: ActiveSession,
    refresh: RefreshState,
  ): Promise<IssuedTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: session.userId } satisfies Omit<AccessTokenPayload, 'jti'>,
        {
          secret: this.config.get('ACCESS_TOKEN_SECRET'),
          audience: ACCESS_TOKEN_AUDIENCE,
          issuer: TOKEN_ISSUER,
          algorithm: TOKEN_ALGORITHM,
          jwtid: session.id,
          expiresIn: this.config.get('ACCESS_TOKEN_TTL_SECONDS'),
        },
      ),
      this.jwt.signAsync(
        { sub: refresh.userId, gen: refresh.generation } satisfies Omit<
          RefreshTokenPayload,
          'jti'
        >,
        {
          secret: this.config.get('REFRESH_TOKEN_SECRET'),
          audience: REFRESH_TOKEN_AUDIENCE,
          issuer: TOKEN_ISSUER,
          algorithm: TOKEN_ALGORITHM,
          jwtid: refresh.sessionId,
          expiresIn: secondsUntil(refresh.expiresAt),
        },
      ),
    ]);
    return { accessToken, refreshToken, refreshExpiresAt: refresh.expiresAt };
  }

  verifyAccess(token: string): Promise<AccessTokenPayload | null> {
    return this.verify(
      token,
      this.config.get('ACCESS_TOKEN_SECRET'),
      ACCESS_TOKEN_AUDIENCE,
      accessTokenPayloadSchema,
    );
  }

  verifyRefresh(token: string): Promise<RefreshTokenPayload | null> {
    return this.verify(
      token,
      this.config.get('REFRESH_TOKEN_SECRET'),
      REFRESH_TOKEN_AUDIENCE,
      refreshTokenPayloadSchema,
    );
  }

  private async verify<T>(
    token: string,
    secret: string,
    audience: string,
    schema: z.ZodType<T>,
  ): Promise<T | null> {
    try {
      const payload: unknown = await this.jwt.verifyAsync(token, {
        secret,
        audience,
        issuer: TOKEN_ISSUER,
        algorithms: [TOKEN_ALGORITHM],
      });
      const parsed = schema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}
