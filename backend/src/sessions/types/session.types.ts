import { z } from 'zod';
import { Permission } from '../../users/constants/permissions.js';

export const activeSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  permissions: z.array(z.enum(Object.values(Permission))),
});

export type ActiveSession = z.infer<typeof activeSessionSchema>;

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

export interface Session {
  id: string;
  userId: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  refreshGeneration: number;
}

export interface SessionView extends Pick<
  Session,
  'id' | 'ip' | 'userAgent' | 'createdAt' | 'expiresAt'
> {
  current: boolean;
}

export interface RefreshState {
  sessionId: string;
  userId: string;
  generation: number;
  expiresAt: Date;
}

export type RotationResult =
  | { status: 'rotated'; session: ActiveSession; refresh: RefreshState }
  | { status: 'reused'; sessionId: string; userId: string }
  | { status: 'invalid' };

export interface IssuedSession {
  session: ActiveSession;
  refresh: RefreshState;
}

export interface NewSession extends SessionMeta {
  id: string;
  userId: string;
  expiresAt: Date;
  retainUntil: Date;
}

export interface RevokedSession {
  id: string;
  expiresAt: Date;
}
