import { randomUUID } from 'node:crypto';
import { defineConfig } from 'vitest/config';

const runId = randomUUID();
const mongoUrl = process.env.E2E_MONGODB_URL ?? 'mongodb://127.0.0.1:27018';
const redisUrl = process.env.E2E_REDIS_URL ?? 'redis://127.0.0.1:6380';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: `${mongoUrl}/auth-e2e-${runId}`,
      REDIS_URL: redisUrl,
      REDIS_KEY_PREFIX: `e2e-${runId}:`,
      ACCESS_TOKEN_SECRET: 'e2e-access-secret-e2e-access-secret-e2e',
      REFRESH_TOKEN_SECRET: 'e2e-refresh-secret-e2e-refresh-secret-e2e',
      COOKIE_SECURE: 'false',
      ALLOW_ADMIN_SIGNUP: 'true',
    },
  },
});
