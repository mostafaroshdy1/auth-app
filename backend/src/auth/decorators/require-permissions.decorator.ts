import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../../users/constants/permissions.js';

export const REQUIRED_PERMISSIONS = 'auth:permissions';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS, permissions);
