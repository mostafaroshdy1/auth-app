import { signInSchema, signUpSchema } from './auth.dto.js';

const valid = { email: 'ada@example.com', name: 'Ada', password: 'Passw0rd!' };

describe('signUpSchema', () => {
  it('normalizes email and name', () => {
    const result = signUpSchema.parse({
      ...valid,
      email: '  Ada@Example.COM ',
      name: '  Ada  ',
    });
    expect(result).toEqual({ ...valid, isAdmin: false });
  });

  it.each([
    ['email', { email: 'not-an-email' }],
    ['short name', { name: 'Al' }],
    ['markup in name', { name: '<b>Ada</b>' }],
    ['short password', { password: 'Pa0!' }],
    ['password without letter', { password: '12345678!' }],
    ['password without number', { password: 'Password!' }],
    ['password without special character', { password: 'Passw0rd1' }],
  ])('rejects %s', (_label, override) => {
    expect(signUpSchema.safeParse({ ...valid, ...override }).success).toBe(
      false,
    );
  });

  it('rejects unknown keys', () => {
    expect(
      signUpSchema.safeParse({ ...valid, permissions: ['users:manage'] })
        .success,
    ).toBe(false);
  });

  it('accepts non-latin names', () => {
    expect(signUpSchema.safeParse({ ...valid, name: 'محمد علي' }).success).toBe(
      true,
    );
  });
});

describe('signInSchema', () => {
  it('rejects operator objects instead of strings', () => {
    expect(
      signInSchema.safeParse({ email: { $gt: '' }, password: 'x' }).success,
    ).toBe(false);
  });
});
