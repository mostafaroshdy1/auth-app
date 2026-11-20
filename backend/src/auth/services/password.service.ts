import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt,
  type ScryptOptions,
  timingSafeEqual,
} from 'node:crypto';
import {
  PASSWORD_HASH_ALGORITHM,
  SCRYPT_KEY_LENGTH,
  SCRYPT_PARAMS,
  SCRYPT_SALT_LENGTH,
} from '../constants/password.constants.js';

@Injectable()
export class PasswordService {
  private readonly dummyHash = this.hash(
    randomBytes(SCRYPT_SALT_LENGTH).toString('hex'),
  );

  async hash(password: string) {
    const salt = randomBytes(SCRYPT_SALT_LENGTH);
    const key = await this.derive(password, salt, SCRYPT_PARAMS);
    const { N, r, p } = SCRYPT_PARAMS;
    return [
      PASSWORD_HASH_ALGORITHM,
      N,
      r,
      p,
      salt.toString('base64'),
      key.toString('base64'),
    ].join('$');
  }

  async verify(password: string, stored: string | undefined) {
    const [algorithm, N, r, p, salt, expected] = (
      stored ?? (await this.dummyHash)
    ).split('$');
    if (algorithm !== PASSWORD_HASH_ALGORITHM || !salt || !expected)
      return false;
    const expectedKey = Buffer.from(expected, 'base64');
    const options = {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT_PARAMS.maxmem,
    };
    const key = await this.derive(
      password,
      Buffer.from(salt, 'base64'),
      options,
    );
    const matches =
      key.length === expectedKey.length && timingSafeEqual(key, expectedKey);
    return stored !== undefined && matches;
  }

  private derive(password: string, salt: Buffer, options: ScryptOptions) {
    return new Promise<Buffer>((resolve, reject) =>
      scrypt(
        password.normalize('NFKC'),
        salt,
        SCRYPT_KEY_LENGTH,
        options,
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
  }
}
