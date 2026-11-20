import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .check(z.email());

export const nameSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .min(3, 'Name must be at least 3 characters')
  .max(50, 'Name must be at most 50 characters')
  .regex(
    /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u,
    'Name may only contain letters, spaces, apostrophes, dots and hyphens',
  );

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/\p{L}/u, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(
    /[^\p{L}\d\s]/u,
    'Password must contain at least one special character',
  );

export const signUpSchema = z.strictObject({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
  isAdmin: z.boolean().default(false),
});

export const signInSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type SignUpDto = z.infer<typeof signUpSchema>;
export type SignInDto = z.infer<typeof signInSchema>;
