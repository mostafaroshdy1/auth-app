import type { Redis } from 'ioredis';
import type { Connection } from 'mongoose';
import { clearTestKeys, dropTestDatabase } from './isolation.js';

describe('e2e isolation guards', () => {
  it.each(['auth', 'auth-e2e', 'production'])(
    'refuses to drop database "%s"',
    async (name) => {
      const dropDatabase = vi.fn();
      await expect(
        dropTestDatabase({ name, dropDatabase } as unknown as Connection),
      ).rejects.toThrow('Refusing');
      expect(dropDatabase).not.toHaveBeenCalled();
    },
  );

  it.each(['', 'session:', 'e2e-:'])(
    'refuses to clear keys with prefix "%s"',
    async (keyPrefix) => {
      const duplicate = vi.fn();
      await expect(
        clearTestKeys({
          options: { keyPrefix },
          duplicate,
        } as unknown as Redis),
      ).rejects.toThrow('Refusing');
      expect(duplicate).not.toHaveBeenCalled();
    },
  );
});
