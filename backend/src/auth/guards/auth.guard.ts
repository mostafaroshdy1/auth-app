import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionsService } from '../../sessions/services/sessions.service.js';
import type { Permission } from '../../users/constants/permissions.js';
import { IS_PUBLIC } from '../decorators/public.decorator.js';
import { REQUIRED_PERMISSIONS } from '../decorators/require-permissions.decorator.js';
import { SessionCookieService } from '../services/session-cookie.service.js';
import { TokenService } from '../services/token.service.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly sessions: SessionsService,
    private readonly cookies: SessionCookieService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets))
      return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.cookies.readAccessToken(request);
    if (!token) throw new UnauthorizedException();

    const payload = await this.tokens.verifyAccess(token);
    if (!payload) throw new UnauthorizedException();

    const session = await this.sessions.resolve(payload.jti);
    if (!session || session.userId !== payload.sub)
      throw new UnauthorizedException();
    request.session = session;

    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRED_PERMISSIONS,
      targets,
    );
    if (
      required?.some((permission) => !session.permissions.includes(permission))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
