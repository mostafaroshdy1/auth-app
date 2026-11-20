import type { NodeRequest } from '@nestjs/platform-node';
import type { ActiveSession } from '../../sessions/types/session.types.js';

export interface AuthenticatedRequest extends NodeRequest {
  session?: ActiveSession;
}
