import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  SerializeOptions,
} from '@nestjs/common';
import type { NodeRequest } from '@nestjs/platform-node';
import { Throttle } from '@nestjs/throttler';
import type { ActiveSession } from '../../sessions/types/session.types.js';
import { userResponseSchema } from '../../users/dto/user-response.dto.js';
import { AUTH_THROTTLE } from '../constants/throttle.constants.js';
import { CurrentSession } from '../decorators/current-session.decorator.js';
import { Public } from '../decorators/public.decorator.js';
import { authOptionsResponseSchema } from '../dto/auth-response.dto.js';
import {
  type SignInDto,
  signInSchema,
  type SignUpDto,
  signUpSchema,
} from '../dto/auth.dto.js';
import { AuthService } from '../services/auth.service.js';
import { SessionCookieService } from '../services/session-cookie.service.js';
import { sessionMetaFrom } from '../utils/session-meta.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: SessionCookieService,
  ) {}

  @Public()
  @Get('options')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ schema: authOptionsResponseSchema })
  options() {
    return this.auth.getOptions();
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @SerializeOptions({ schema: userResponseSchema })
  async signUp(
    @Body({ schema: signUpSchema }) body: SignUpDto,
    @Req() req: NodeRequest,
    @Res({ passthrough: true }) res: unknown,
  ) {
    const { user, tokens } = await this.auth.signUp(body, sessionMetaFrom(req));
    this.cookies.set(res, tokens);
    return user;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ schema: userResponseSchema })
  async signIn(
    @Body({ schema: signInSchema }) body: SignInDto,
    @Req() req: NodeRequest,
    @Res({ passthrough: true }) res: unknown,
  ) {
    const { user, tokens } = await this.auth.signIn(body, sessionMetaFrom(req));
    this.cookies.set(res, tokens);
    return user;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(
    @Req() req: NodeRequest,
    @Res({ passthrough: true }) res: unknown,
  ) {
    try {
      this.cookies.set(
        res,
        await this.auth.refresh(
          this.cookies.readRefreshToken(req),
          sessionMetaFrom(req),
        ),
      );
    } catch (error) {
      this.cookies.clear(res);
      throw error;
    }
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  async signOut(
    @CurrentSession() session: ActiveSession,
    @Res({ passthrough: true }) res: unknown,
  ) {
    await this.auth.signOut(session);
    this.cookies.clear(res);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ schema: userResponseSchema })
  me(@CurrentSession() session: ActiveSession) {
    return this.auth.getProfile(session);
  }
}
