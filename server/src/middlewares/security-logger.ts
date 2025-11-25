import type { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger.js';

/**
 * Получение IP адреса клиента с учетом прокси
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || 'unknown';
}

/**
 * Middleware для логирования подозрительной активности
 */
export function securityLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const userAgent = req.get('user-agent') || 'unknown';
  const path = req.path;
  const method = req.method;

  // Логируем подозрительные паттерны
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // XSS попытки
    /union.*select/i, // SQL injection
    /exec\(/i, // Command injection
    /eval\(/i, // Code injection
  ];

  const bodyString = JSON.stringify(req.body || {});
  const queryString = JSON.stringify(req.query || {});
  const paramsString = JSON.stringify(req.params || {});
  const allInput = `${bodyString} ${queryString} ${paramsString}`.toLowerCase();

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allInput)) {
      logger.warn(
        {
          type: 'suspicious_activity',
          ip,
          userAgent,
          path,
          method,
          pattern: pattern.toString(),
          body: req.body,
          query: req.query,
          params: req.params,
        },
        'Suspicious activity detected',
      );
      break;
    }
  }

  next();
}

/**
 * Логирование неудачных попыток входа
 */
export function logFailedLoginAttempt(email: string, ip: string, reason: string): void {
  logger.warn(
    {
      type: 'failed_login_attempt',
      email,
      ip,
      reason,
      timestamp: new Date().toISOString(),
    },
    'Failed login attempt',
  );
}

/**
 * Логирование попыток доступа к чужим данным
 */
export function logUnauthorizedAccessAttempt(
  userId: number | undefined,
  requestedResourceId: number,
  resourceType: string,
  ip: string,
): void {
  logger.warn(
    {
      type: 'unauthorized_access_attempt',
      userId,
      requestedResourceId,
      resourceType,
      ip,
      timestamp: new Date().toISOString(),
    },
    'Unauthorized access attempt',
  );
}

/**
 * Логирование множественных неудачных попыток входа с одного IP
 */
export function logBruteForceAttempt(ip: string, attemptCount: number): void {
  logger.error(
    {
      type: 'brute_force_attempt',
      ip,
      attemptCount,
      timestamp: new Date().toISOString(),
    },
    `Brute force attempt detected from IP: ${ip} (${attemptCount} attempts)`,
  );
}
