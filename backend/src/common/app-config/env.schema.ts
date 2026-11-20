import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((value) => value === 'true');

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    MONGODB_URI: z.url(),
    REDIS_URL: z.url(),
    REDIS_KEY_PREFIX: z
      .string()
      .regex(/^[\w.-]*:?$/)
      .default(''),
    ACCESS_TOKEN_SECRET: z.string().min(32),
    REFRESH_TOKEN_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60),
    SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 7),
    SESSION_RETENTION_DAYS: z.coerce.number().int().positive().default(180),
    COOKIE_SECURE: bool.default(true),
    ALLOW_ADMIN_SIGNUP: bool.default(false),
  })
  .refine((env) => env.ACCESS_TOKEN_SECRET !== env.REFRESH_TOKEN_SECRET, {
    message: 'ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must differ',
    path: ['REFRESH_TOKEN_SECRET'],
  })
  .refine((env) => env.ACCESS_TOKEN_TTL_SECONDS < env.SESSION_TTL_SECONDS, {
    message:
      'ACCESS_TOKEN_TTL_SECONDS must be shorter than SESSION_TTL_SECONDS',
    path: ['ACCESS_TOKEN_TTL_SECONDS'],
  });

export type EnvSchema = z.infer<typeof envSchema>;
