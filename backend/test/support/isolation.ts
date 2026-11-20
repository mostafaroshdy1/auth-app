import type { Redis } from 'ioredis';
import type { Connection } from 'mongoose';

const E2E_DATABASE = /^auth-e2e-[\da-f-]{36}$/;
const E2E_PREFIX = /^e2e-[\da-f-]{36}:$/;

export async function dropTestDatabase(connection: Connection) {
  if (!E2E_DATABASE.test(connection.name)) {
    throw new Error(`Refusing to drop non-test database "${connection.name}"`);
  }
  await connection.dropDatabase();
}

export async function clearTestKeys(redis: Redis) {
  const prefix = redis.options.keyPrefix ?? '';
  if (!E2E_PREFIX.test(prefix)) {
    throw new Error(
      `Refusing to clear keys without an e2e prefix ("${prefix}")`,
    );
  }
  const raw = redis.duplicate({ keyPrefix: '' });
  try {
    for await (const keys of raw.scanStream({
      match: `${prefix}*`,
      count: 200,
    }) as AsyncIterable<string[]>) {
      if (keys.length > 0) await raw.unlink(...keys);
    }
  } finally {
    raw.disconnect();
  }
}
