import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  SerializeOptions,
} from '@nestjs/common';
import { CurrentSession } from '../../auth/decorators/current-session.decorator.js';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator.js';
import { objectIdSchema } from '../../common/validation/ids.schema.js';
import type { ActiveSession } from '../../sessions/types/session.types.js';
import { Permission } from '../../users/constants/permissions.js';
import { userResponseSchema } from '../../users/dto/user-response.dto.js';
import {
  type UpdatePermissionsDto,
  updatePermissionsSchema,
} from '../dto/update-permissions.dto.js';
import { AdminService } from '../services/admin.service.js';

@Controller('admin')
@SerializeOptions({ schema: userResponseSchema })
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.UsersRead)
  listUsers() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.UsersManage)
  updatePermissions(
    @CurrentSession() current: ActiveSession,
    @Param('id', { schema: objectIdSchema }) id: string,
    @Body({ schema: updatePermissionsSchema })
    { permissions }: UpdatePermissionsDto,
  ) {
    return this.admin.setPermissions(current.userId, id, permissions);
  }
}
