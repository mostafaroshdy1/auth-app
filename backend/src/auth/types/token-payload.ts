import { z } from 'zod';

export const accessTokenPayloadSchema = z.object({
  sub: z.string(),
  jti: z.uuid(),
});

export const refreshTokenPayloadSchema = z.object({
  sub: z.string(),
  jti: z.uuid(),
  gen: z.number().int().min(0),
});

export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}
