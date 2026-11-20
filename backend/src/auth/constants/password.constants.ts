import type { ScryptOptions } from 'node:crypto';

export const PASSWORD_HASH_ALGORITHM = 'scrypt';
export const SCRYPT_PARAMS = {
  N: 2 ** 15,
  r: 8,
  p: 3,
  maxmem: 64 * 1024 * 1024,
} satisfies ScryptOptions;
export const SCRYPT_KEY_LENGTH = 64;
export const SCRYPT_SALT_LENGTH = 16;
