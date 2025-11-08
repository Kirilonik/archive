import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../../shared/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  res.setHeader('x-request-id', requestId);

  const childLogger = logger.child({
    requestId,
    method: req.method,
    path: req.originalUrl,
  });

  req.requestId = requestId;
  req.log = childLogger;

  const startedAt = process.hrtime.bigint ? process.hrtime.bigint() : BigInt(Date.now());

  res.on('finish', () => {
    const finishedAt = process.hrtime.bigint ? process.hrtime.bigint() : BigInt(Date.now());
    const durationNs = finishedAt - startedAt;
    const durationMs = Number(durationNs) / 1_000_000;

    const log = res.statusCode >= 500 ? childLogger.error.bind(childLogger) : childLogger.info.bind(childLogger);

    log(
      {
        statusCode: res.statusCode,
        durationMs: Number.isFinite(durationMs) ? Number(durationMs.toFixed(3)) : undefined,
      },
      'request.completed',
    );
  });

  childLogger.info('request.received');

  next();
}


