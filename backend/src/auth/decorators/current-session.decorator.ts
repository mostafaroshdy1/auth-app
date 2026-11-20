import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { ActiveSession } from '../../sessions/types/session.types.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveSession => {
    const { session } = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!session) throw new UnauthorizedException();
    return session;
  },
);
