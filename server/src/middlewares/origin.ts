import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const allowedOrigins = new Set(env.allowedOrigins);

function extractOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

export function originValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method?.toUpperCase() ?? 'GET';
  if (SAFE_METHODS.has(method)) {
    next();
    return;
  }

  // Для небезопасных методов требуем наличие валидного origin или referer
  const headerOrigin = extractOrigin(req.headers.origin as string | undefined);
  if (headerOrigin) {
    if (allowedOrigins.has(headerOrigin)) {
      next();
      return;
    }
    // Логируем для отладки
    console.log('Origin validation failed:', {
      headerOrigin,
      allowedOrigins: Array.from(allowedOrigins),
      referer: req.headers.referer,
    });
    res.status(403).json({ error: 'Origin not allowed', received: headerOrigin, allowed: Array.from(allowedOrigins) });
    return;
  }

  const refererOrigin = extractOrigin(req.headers.referer as string | undefined);
  if (refererOrigin) {
    if (allowedOrigins.has(refererOrigin)) {
      next();
      return;
    }
    // Логируем для отладки
    console.log('Origin validation failed (referer):', {
      refererOrigin,
      allowedOrigins: Array.from(allowedOrigins),
      origin: req.headers.origin,
    });
    res.status(403).json({ error: 'Origin not allowed', received: refererOrigin, allowed: Array.from(allowedOrigins) });
    return;
  }

  // Если нет ни origin, ни referer для небезопасного метода - отклоняем
  console.log('Origin validation failed (no origin/referer):', {
    origin: req.headers.origin,
    referer: req.headers.referer,
    allowedOrigins: Array.from(allowedOrigins),
  });
  res.status(403).json({ error: 'Origin validation required for this request' });
}


