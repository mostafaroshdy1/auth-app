import type { NodeRequest } from '@nestjs/platform-node';
import type { SessionMeta } from '../../sessions/types/session.types.js';

export const sessionMetaFrom = (req: NodeRequest): SessionMeta => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});
