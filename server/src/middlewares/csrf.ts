import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

function ensureCsrfCookie(req: Request, res: Response): string {
  let token = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  if (!token) {
    token = randomUUID();
    const isProd = env.NODE_ENV === 'production';
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  return token;
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
    res.status(403).json({ error: 'CSRF token mismatch' });
    return;
  }

  next();
}


