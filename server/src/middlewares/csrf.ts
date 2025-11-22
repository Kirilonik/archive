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
    const isProd = env.NODE_ENV === 'production';
    // В production используем secure только если есть HTTPS
    // Для HTTP (без домена с SSL) secure должен быть false
    const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    // Для cross-origin запросов нужен sameSite: 'none', но это требует secure: true
    // Если нет HTTPS, используем 'lax' (но тогда cookie не будет отправляться в cross-origin POST)
    // Временное решение для HTTP: используем 'none' с secure: false (небезопасно, но работает)
    const sameSite = isHttps ? 'none' : 'none'; // Для HTTP тоже 'none', чтобы работало cross-origin
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: true, // Безопасно: токен недоступен через JavaScript
      secure: isProd && isHttps, // Только для HTTPS в production
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
    logger.warn({
      hasHeaderToken: !!headerToken,
      headerTokenLength: headerToken?.length,
      cookieTokenLength: token?.length,
      tokensMatch: headerToken === token,
      path: req.path,
      method: req.method,
    }, 'CSRF token mismatch');
    res.status(403).json({ error: 'CSRF token mismatch' });
    return;
  }

  next();
}


