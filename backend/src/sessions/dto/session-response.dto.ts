import { z } from 'zod';

export const sessionResponseSchema = z.object({
  id: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
  expiresAt: z.date(),
  current: z.boolean(),
});

export const revokeOthersResponseSchema = z.object({
  revoked: z.number().int().min(0),
});
