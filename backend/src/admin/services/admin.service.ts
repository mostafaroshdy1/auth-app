import { BadRequestException, Injectable } from '@nestjs/common';
import { SessionsService } from '../../sessions/services/sessions.service.js';
import type { Permission } from '../../users/constants/permissions.js';
import { UsersService } from '../../users/services/users.service.js';
import type { User } from '../../users/types/user.types.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
  ) {}

  listUsers(): Promise<User[]> {
    return this.users.list();
  }

  async setPermissions(
    actorId: string,
    userId: string,
    permissions: Permission[],
  ): Promise<User> {
    if (actorId === userId)
      throw new BadRequestException('You cannot change your own permissions');
    const user = await this.users.setPermissions(userId, permissions);
    await this.sessions.refreshPermissions(user.id, user.permissions);
    return user;
  }
}
