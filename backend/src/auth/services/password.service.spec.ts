import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('verifies a password against its own hash', async () => {
    const hash = await service.hash('Passw0rd!');
    expect(hash).toMatch(/^scrypt\$/);
    await expect(service.verify('Passw0rd!', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await service.hash('Passw0rd!');
    await expect(service.verify('Passw0rd?', hash)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    expect(await service.hash('Passw0rd!')).not.toBe(
      await service.hash('Passw0rd!'),
    );
  });

  it('returns false when there is no stored hash', async () => {
    await expect(service.verify('Passw0rd!', undefined)).resolves.toBe(false);
  });
});
