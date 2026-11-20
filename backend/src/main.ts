import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { AppModule } from './app.module.js';
import { setupApp } from './setup.js';

const app = await NestFactory.create<NestNodeApplication>(
  AppModule,
  new NodeAdapter({ trustProxy: process.env.TRUST_PROXY ?? false }),
  {
    logger: new ConsoleLogger({
      json: true,
      redact: ['password', 'passwordHash', 'token', 'cookie', 'authorization'],
    }),
  },
);

setupApp(app);
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
