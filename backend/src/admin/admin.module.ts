import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminController } from './controllers/admin.controller.js';
import { AdminService } from './services/admin.service.js';

@Module({
  imports: [UsersModule, SessionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
