import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AppConfigService } from '../../common/app-config/app-config.service.js';
import { SessionsService } from '../../sessions/services/sessions.service.js';
import type {
  ActiveSession,
  SessionMeta,
} from '../../sessions/types/session.types.js';
import { ADMIN_PERMISSIONS } from '../../users/constants/permissions.js';
import { UsersService } from '../../users/services/users.service.js';
import type { User } from '../../users/types/user.types.js';
import type { SignInDto, SignUpDto } from '../dto/auth.dto.js';
import type { IssuedTokens } from '../types/token-payload.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

export interface AuthResult {
  user: User;
  tokens: IssuedTokens;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly config: AppConfigService,
  ) {}

  getOptions() {
    return { adminSignup: this.config.get('ALLOW_ADMIN_SIGNUP') };
  }

  async signUp(
    { email, name, password, isAdmin }: SignUpDto,
    meta: SessionMeta,
  ): Promise<AuthResult> {
    if (isAdmin && !this.config.get('ALLOW_ADMIN_SIGNUP'))
      throw new ForbiddenException('Admin sign-up is disabled');
    const user = await this.users.create({
      email,
      name,
      passwordHash: await this.passwords.hash(password),
      permissions: isAdmin ? ADMIN_PERMISSIONS : [],
    });
    this.logger.log('User signed up', { userId: user.id, admin: isAdmin });
    return { user, tokens: await this.startSession(user, meta) };
  }

  async signIn(
    { email, password }: SignInDto,
    meta: SessionMeta,
  ): Promise<AuthResult> {
    const credentials = await this.users.findCredentials(email);
    const valid = await this.passwords.verify(
      password,
      credentials?.passwordHash,
    );
    if (!credentials || !valid) {
      this.logger.warn('Failed sign-in attempt', { ip: meta.ip });
      throw new UnauthorizedException('Invalid email or password');
    }
    this.logger.log('User signed in', { userId: credentials.user.id });
    return {
      user: credentials.user,
      tokens: await this.startSession(credentials.user, meta),
    };
  }

  async refresh(
    refreshToken: string | undefined,
    meta: SessionMeta,
  ): Promise<IssuedTokens> {
    const payload = refreshToken
      ? await this.tokens.verifyRefresh(refreshToken)
      : null;
    if (!payload) throw new UnauthorizedException('Invalid refresh token');

    const result = await this.sessions.rotate(payload.jti, payload.gen);
    if (result.status === 'reused') {
      this.logger.warn('Refresh token reuse detected, session revoked', {
        sessionId: result.sessionId,
        userId: result.userId,
        ip: meta.ip,
      });
      throw new UnauthorizedException('Session has been revoked');
    }
    if (result.status === 'invalid' || result.session.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.tokens.issue(result.session, result.refresh);
  }

  signOut(session: ActiveSession) {
    return this.sessions.revoke(session.userId, session.id);
  }

  getProfile(session: ActiveSession) {
    return this.users.getById(session.userId);
  }

  private async startSession(
    user: User,
    meta: SessionMeta,
  ): Promise<IssuedTokens> {
    const { session, refresh } = await this.sessions.create(
      user.id,
      user.permissions,
      meta,
    );
    return this.tokens.issue(session, refresh);
  }
}
