import type {
  CredentialRecord,
  UserRecord,
} from '../schemas/user.projections.js';
import type { User, UserCredentials } from '../types/user.types.js';

export const toUser = ({
  _id,
  email,
  name,
  permissions,
  createdAt,
}: UserRecord): User => ({
  id: _id.toString(),
  email,
  name,
  permissions,
  createdAt,
});

export const toUserCredentials = (
  record: CredentialRecord,
): UserCredentials => ({
  user: toUser(record),
  passwordHash: record.passwordHash,
});
