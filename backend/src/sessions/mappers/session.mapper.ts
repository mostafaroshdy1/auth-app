import type {
  ExpiryRecord,
  RotationRecord,
  SessionRecord,
} from '../schemas/session.projections.js';
import type {
  RefreshState,
  RevokedSession,
  Session,
  SessionView,
} from '../types/session.types.js';

export const toSession = ({
  _id,
  userId,
  ip,
  userAgent,
  createdAt,
  expiresAt,
  revokedAt,
  refreshGeneration,
}: SessionRecord): Session => ({
  id: _id,
  userId: userId.toString(),
  ip,
  userAgent,
  createdAt,
  expiresAt,
  revokedAt,
  refreshGeneration,
});

export const toSessionView = (
  { id, ip, userAgent, createdAt, expiresAt }: Session,
  currentId: string,
): SessionView => ({
  id,
  ip,
  userAgent,
  createdAt,
  expiresAt,
  current: id === currentId,
});

export const toRefreshState = ({
  _id,
  userId,
  refreshGeneration,
  expiresAt,
}: RotationRecord): RefreshState => ({
  sessionId: _id,
  userId: userId.toString(),
  generation: refreshGeneration,
  expiresAt,
});

export const toRevokedSession = ({
  _id,
  expiresAt,
}: ExpiryRecord): RevokedSession => ({ id: _id, expiresAt });
