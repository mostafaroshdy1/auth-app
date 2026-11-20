import {
  type Projected,
  projection,
} from '../../common/database/projection.js';
import { SessionEntity } from './session.schema.js';

export const sessionFields = projection<SessionEntity>()({
  userId: 1,
  ip: 1,
  userAgent: 1,
  createdAt: 1,
  expiresAt: 1,
  revokedAt: 1,
  refreshGeneration: 1,
});
export const expiryFields = projection<SessionEntity>()({ expiresAt: 1 });
export const rotationFields = projection<SessionEntity>()({
  userId: 1,
  expiresAt: 1,
  refreshGeneration: 1,
});

export type SessionRecord = Projected<
  SessionEntity,
  typeof sessionFields,
  string
>;
export type ExpiryRecord = Projected<
  SessionEntity,
  typeof expiryFields,
  string
>;
export type RotationRecord = Projected<
  SessionEntity,
  typeof rotationFields,
  string
>;
