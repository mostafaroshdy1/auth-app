import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { isDuplicateKeyError } from '../../common/database/mongo-errors.js';
import type { Permission } from '../constants/permissions.js';
import { toUser, toUserCredentials } from '../mappers/user.mapper.js';
import {
  type CredentialRecord,
  credentialFields,
  userFields,
  type UserRecord,
} from '../schemas/user.projections.js';
import { UserEntity } from '../schemas/user.schema.js';
import type { NewUser, User, UserCredentials } from '../types/user.types.js';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(UserEntity.name) private readonly users: Model<UserEntity>,
  ) {}

  async create(data: NewUser): Promise<User | null> {
    try {
      const { _id, email, name, permissions, createdAt } =
        await this.users.create(data);
      return toUser({ _id, email, name, permissions, createdAt });
    } catch (error) {
      if (isDuplicateKeyError(error)) return null;
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    const record = await this.users
      .findById(id, userFields)
      .lean<UserRecord>()
      .exec();
    return record && toUser(record);
  }

  async findCredentials(email: string): Promise<UserCredentials | null> {
    const record = await this.users
      .findOne({ email }, credentialFields)
      .lean<CredentialRecord>()
      .exec();
    return record && toUserCredentials(record);
  }

  async findAll(limit = 100): Promise<User[]> {
    const records = await this.users
      .find({}, userFields)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<UserRecord[]>()
      .exec();
    return records.map(toUser);
  }

  async updatePermissions(
    id: string,
    permissions: Permission[],
  ): Promise<User | null> {
    if (!isValidObjectId(id)) return null;
    const record = await this.users
      .findByIdAndUpdate(
        id,
        { permissions },
        {
          projection: userFields,
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .lean<UserRecord>()
      .exec();
    return record && toUser(record);
  }
}
