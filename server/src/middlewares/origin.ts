import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);
const allowedOrigins = new Set(env.allowedOrigins);

/**
 * Нормализует origin для сравнения
 * Обрабатывает IDN домены (Punycode) и приводит к единому формату
 */
function normalizeOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    // Нормализуем hostname (IDN домены автоматически конвертируются в Punycode)
    const normalized = `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ''}`;
    return normalized;
  } catch {
    return origin.toLowerCase();
  }
}

function extractOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Проверяет, разрешен ли origin (с учетом нормализации)
 */
function isOriginAllowed(origin: string): boolean {
  const normalized = normalizeOrigin(origin);

  // Прямое сравнение
  if (allowedOrigins.has(origin) || allowedOrigins.has(normalized)) {
    return true;
  }

  // Сравнение с нормализованными разрешенными origins
  for (const allowed of allowedOrigins) {
    const normalizedAllowed = normalizeOrigin(allowed);
    if (normalized === normalizedAllowed) {
      return true;
    }
  }

  return false;
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
    if (isOriginAllowed(headerOrigin)) {
      next();
      return;
    }
    // Логируем для отладки
    logger.warn(
      {
        headerOrigin,
        normalizedOrigin: normalizeOrigin(headerOrigin),
        allowedOrigins: Array.from(allowedOrigins),
        normalizedAllowedOrigins: Array.from(allowedOrigins).map(normalizeOrigin),
        referer: req.headers.referer,
        path: req.path,
        method: req.method,
      },
      'Origin validation failed',
    );
    res.status(403).json({
      error: 'Origin not allowed',
      received: headerOrigin,
      allowed: Array.from(allowedOrigins),
    });
    return;
  }

  const refererOrigin = extractOrigin(req.headers.referer as string | undefined);
  if (refererOrigin) {
    if (isOriginAllowed(refererOrigin)) {
      next();
      return;
    }
    // Логируем для отладки
    logger.warn(
      {
        refererOrigin,
        normalizedRefererOrigin: normalizeOrigin(refererOrigin),
        allowedOrigins: Array.from(allowedOrigins),
        normalizedAllowedOrigins: Array.from(allowedOrigins).map(normalizeOrigin),
        origin: req.headers.origin,
        path: req.path,
        method: req.method,
      },
      'Origin validation failed (referer)',
    );
    res.status(403).json({
      error: 'Origin not allowed',
      received: refererOrigin,
      allowed: Array.from(allowedOrigins),
    });
    return;
  }

  // Если нет ни origin, ни referer для небезопасного метода - отклоняем
  logger.warn(
    {
      origin: req.headers.origin,
      referer: req.headers.referer,
      allowedOrigins: Array.from(allowedOrigins),
    },
    'Origin validation failed (no origin/referer)',
  );
  res.status(403).json({ error: 'Origin validation required for this request' });
}
