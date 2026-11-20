import { z } from 'zod';
import { Permission } from '../constants/permissions.js';

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  permissions: z.array(z.enum(Object.values(Permission))),
  createdAt: z.date(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;
