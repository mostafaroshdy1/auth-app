import type { AppConfigService } from '../app-config/app-config.service.js';
import type { EnvSchema } from '../app-config/env.schema.js';

export const testEnv: EnvSchema = {
  NODE_ENV: 'test',
  PORT: 3000,
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
  REDIS_URL: 'redis://127.0.0.1:6379',
  REDIS_KEY_PREFIX: '',
  ACCESS_TOKEN_SECRET: 'access-secret-access-secret-access-secret',
  REFRESH_TOKEN_SECRET: 'refresh-secret-refresh-secret-refresh-secret',
  ACCESS_TOKEN_TTL_SECONDS: 900,
  SESSION_TTL_SECONDS: 3600,
  SESSION_RETENTION_DAYS: 180,
  COOKIE_SECURE: true,
  ALLOW_ADMIN_SIGNUP: false,
};

export const testConfig = (
  overrides: Partial<EnvSchema> = {},
): AppConfigService => {
  const env = { ...testEnv, ...overrides };
  return {
    get: <K extends keyof EnvSchema>(key: K) => env[key],
  } as AppConfigService;
};
