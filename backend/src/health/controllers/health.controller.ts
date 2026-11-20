import { Controller, Get, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { Public } from '../../auth/decorators/public.decorator.js';
import { REDIS } from '../../infrastructure/redis/redis.module.js';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    private readonly mongo: MongooseHealthIndicator,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.mongo.pingCheck('mongodb').withTimeout('1s'),
      () =>
        this.indicators
          .check('redis')
          .attempt(() => this.redis.ping())
          .withTimeout('1s'),
    ]);
  }
}
