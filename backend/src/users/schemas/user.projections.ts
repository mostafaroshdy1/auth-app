import {
  type Projected,
  projection,
} from '../../common/database/projection.js';
import { UserEntity } from './user.schema.js';

export const userFields = projection<UserEntity>()({
  email: 1,
  name: 1,
  permissions: 1,
  createdAt: 1,
});
export const credentialFields = projection<UserEntity>()({
  ...userFields,
  passwordHash: 1,
});

export type UserRecord = Projected<UserEntity, typeof userFields>;
export type CredentialRecord = Projected<UserEntity, typeof credentialFields>;
