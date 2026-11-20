import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module.js';
import { SessionsController } from './controllers/sessions.controller.js';
import { SessionsRepository } from './repositories/sessions.repository.js';
import { SessionEntity, SessionSchema } from './schemas/session.schema.js';
import { SessionCacheService } from './services/session-cache.service.js';
import { SessionsService } from './services/sessions.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SessionEntity.name, schema: SessionSchema },
    ]),
    UsersModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsRepository, SessionCacheService, SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
