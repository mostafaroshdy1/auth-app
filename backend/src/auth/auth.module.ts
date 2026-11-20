import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { SessionsModule } from '../sessions/sessions.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { AuthGuard } from './guards/auth.guard.js';
import { AuthService } from './services/auth.service.js';
import { PasswordService } from './services/password.service.js';
import { SessionCookieService } from './services/session-cookie.service.js';
import { TokenService } from './services/token.service.js';

@Module({
  imports: [UsersModule, SessionsModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    SessionCookieService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
