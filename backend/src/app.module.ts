import {
  MiddlewareConsumer,
  Module,
  NestModule,
  StandardSchemaSerializerInterceptor,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware.js';
import { AppConfigModule } from './common/app-config/app-config.module.js';
import { AppConfigService } from './common/app-config/app-config.service.js';
import { HealthModule } from './health/health.module.js';
import { RedisThrottlerStorage } from './infrastructure/redis/redis-throttler.storage.js';
import { REDIS, RedisModule } from './infrastructure/redis/redis.module.js';
import { SessionsModule } from './sessions/sessions.module.js';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.get('MONGODB_URI'),
        sanitizeFilter: true,
        autoIndex: true,
      }),
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [REDIS],
      useFactory: (redis: Redis) => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
        storage: new RedisThrottlerStorage(redis),
      }),
    }),
    AuthModule,
    SessionsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: StandardSchemaSerializerInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}
