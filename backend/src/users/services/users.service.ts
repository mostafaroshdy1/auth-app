import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Permission } from '../constants/permissions.js';
import { UsersRepository } from '../repositories/users.repository.js';
import type { NewUser, User } from '../types/user.types.js';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  async create(data: NewUser): Promise<User> {
    const user = await this.users.create(data);
    if (!user)
      throw new ConflictException('An account with this email already exists');
    return user;
  }

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  findById(id: string) {
    return this.users.findById(id);
  }

  findCredentials(email: string) {
    return this.users.findCredentials(email);
  }

  list() {
    return this.users.findAll();
  }

  async setPermissions(id: string, permissions: Permission[]): Promise<User> {
    const user = await this.users.updatePermissions(id, permissions);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
