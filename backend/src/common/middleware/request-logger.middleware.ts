import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NodeRequest, NodeResponse } from '@nestjs/platform-node';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: NodeRequest, res: NodeResponse, next: () => void) {
    const started = process.hrtime.bigint();
    const requestId = req.get('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
      const message = `${req.method} ${req.url} ${res.statusCode}`;
      const params = {
        requestId,
        method: req.method,
        path: req.url,
        status: res.statusCode,
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        ip: req.ip,
      };
      if (res.statusCode >= 500) this.logger.error(message, params);
      else if (res.statusCode >= 400) this.logger.warn(message, params);
      else this.logger.log(message, params);
    });
    next();
  }
}
