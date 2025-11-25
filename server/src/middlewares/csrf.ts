import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

function ensureCsrfCookie(req: Request, res: Response): string {
  let token = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  if (!token) {
    token = randomUUID();
    const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    // Для sameSite: 'none' обязательно нужен secure: true
    // Если HTTPS, используем 'none', иначе 'lax'
    const sameSite = isHttps ? 'none' : 'lax';
    const secure = isHttps; // Для sameSite: 'none' всегда нужен secure: true

    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true, // Безопасно: токен недоступен через JavaScript
      secure: secure, // Обязательно true для sameSite: 'none', иначе false
      sameSite: sameSite as 'lax' | 'strict' | 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  return token;
}

// Экспортируем функцию для получения токена через API
export function getCsrfToken(req: Request, res: Response): void {
  const token = ensureCsrfCookie(req, res);
  res.json({ token });
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = ensureCsrfCookie(req, res);
  const method = req.method?.toUpperCase() ?? 'GET';
  if (SAFE_METHODS.has(method)) {
    next();
    return;
  }

  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;
  if (!headerToken || headerToken !== token) {
    logger.warn(
      {
        hasHeaderToken: !!headerToken,
        headerTokenLength: headerToken?.length,
        cookieTokenLength: token?.length,
        tokensMatch: headerToken === token,
        path: req.path,
        method: req.method,
      },
      'CSRF token mismatch',
    );
    res.status(403).json({ error: 'CSRF token mismatch' });
    return;
  }

  next();
}
