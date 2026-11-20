import { z } from 'zod';
import { Permission } from '../../users/constants/permissions.js';

export const updatePermissionsSchema = z.strictObject({
  permissions: z
    .array(z.enum(Object.values(Permission)))
    .max(10)
    .transform((list) => [...new Set(list)]),
});

export type UpdatePermissionsDto = z.infer<typeof updatePermissionsSchema>;
