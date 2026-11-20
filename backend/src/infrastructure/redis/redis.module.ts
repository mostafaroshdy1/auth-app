import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { AppConfigService } from '../../common/app-config/app-config.service.js';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        new Redis(config.get('REDIS_URL'), {
          keyPrefix: config.get('REDIS_KEY_PREFIX'),
          maxRetriesPerRequest: 2,
        }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit();
  }
}
