import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { NestNodeApplication } from '@nestjs/platform-node';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApp(app: NestNodeApplication) {
  app.setGlobalPrefix('api');
  app.useSecurityHeaders();
  app.enableCsrfProtection();
  app.useBodyParser('json', { limit: '10kb' });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Auth API')
      .setVersion('1.0')
      .addCookieAuth('session')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
  return app;
}
