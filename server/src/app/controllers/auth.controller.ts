import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../../application/auth/auth.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logger.js';
import { isErrorWithStatus, getErrorMessage } from '../../shared/error-utils.js';
import { logFailedLoginAttempt } from '../../middlewares/security-logger.js';

/**
 * Получение IP адреса клиента
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

function setRefreshCookie(res: Response, token: string, req: Request) {
  const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  const sameSite = isHttps ? 'none' : 'lax';
  const secure = isHttps;

  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: secure,
    sameSite: sameSite as 'lax' | 'strict' | 'none',
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function setAccessCookie(res: Response, token: string, req: Request) {
  const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  const sameSite = isHttps ? 'none' : 'lax';
  const secure = isHttps;

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: secure,
    sameSite: sameSite as 'lax' | 'strict' | 'none',
    path: '/',
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
  });
}

function toApiUser(user: {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatarUrl,
    email_verified: user.emailVerified ?? false,
  };
}

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly getProfileById: (userId: number) => Promise<{
      id: number;
      email: string;
      name: string | null;
      avatarUrl: string | null;
    } | null>,
  ) {}

  /**
   * Валидация сложности пароля
   * Требования:
   * - Минимум 8 символов
   * - Хотя бы одна заглавная буква
   * - Хотя бы одна строчная буква
   * - Хотя бы одна цифра
   */
  private validatePasswordStrength(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
      return { valid: false, error: 'Пароль должен содержать минимум 8 символов' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Пароль должен содержать хотя бы одну заглавную букву' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Пароль должен содержать хотя бы одну строчную букву' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Пароль должен содержать хотя бы одну цифру' };
    }
    return { valid: true };
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().optional(),
        email: z.string().email(),
        password: z.string().min(8),
      });
      const { name, email, password } = schema.parse(req.body);

      // Проверка сложности пароля
      const passwordValidation = this.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
      }

      const { user } = await this.authService.register({ name: name ?? null, email, password });

      // Не выдаем токены, пользователь должен подтвердить email
      res.status(201).json({
        user: toApiUser(user),
        message: 'Регистрация успешна. Пожалуйста, проверьте вашу почту и подтвердите email адрес.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if ((error as any)?.status === 409) {
        return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
      }
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string(),
      });
      const { email, password } = schema.parse(req.body);
      const ip = getClientIp(req);
      try {
        const result = await this.authService.login({ email, password });
        if (!result) {
          // Логируем неудачную попытку входа
          logFailedLoginAttempt(email, ip, 'invalid_credentials');
          return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        setRefreshCookie(res, result.tokens.refreshToken, req);
        setAccessCookie(res, result.tokens.accessToken, req);
        res.json({ user: toApiUser(result.user) });
      } catch (error: any) {
        // Проверяем, требуется ли подтверждение email
        if (error?.requiresEmailVerification) {
          return res.status(403).json({
            error: error.message,
            requiresEmailVerification: true,
          });
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const ip = getClientIp(req);
        logFailedLoginAttempt(req.body?.email || 'unknown', ip, 'validation_error');
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };

  loginWithGoogle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        credential: z.string().min(10),
      });
      const { credential } = schema.parse(req.body);
      const result = await this.authService.loginWithGoogle(credential);
      setRefreshCookie(res, result.tokens.refreshToken, req);
      setAccessCookie(res, result.tokens.accessToken, req);
      res.json({ user: toApiUser(result.user) });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if (isErrorWithStatus(error) && error.status === 401) {
        const cause = error.cause instanceof Error ? error.cause.message : undefined;
        logger.warn(
          {
            error: getErrorMessage(error),
            cause,
            type: 'google_token_verification_failed',
          },
          'Google token verification failed',
        );
        return res.status(401).json({ error: 'Не удалось подтвердить Google аккаунт' });
      }
      // Логируем неожиданные ошибки
      const stack = error instanceof Error ? error.stack : undefined;
      logger.error({ error: getErrorMessage(error), stack }, 'Unexpected error in Google login');
      next(error);
    }
  };

  refresh = async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token not found' });
    }
    try {
      const payload = this.authService.verifyRefreshToken(token);
      const user = await this.getProfileById(payload.id);
      if (!user) {
        // Пользователь удален или токен недействителен - очищаем cookies
        const isProd = env.NODE_ENV === 'production';
        res.clearCookie('refresh_token', {
          path: '/api/auth',
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
        });
        res.clearCookie('access_token', {
          path: '/',
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
        });
        return res.status(401).json({ error: 'User not found or token invalid' });
      }
      const tokens = this.authService.rotateTokens(user);
      setRefreshCookie(res, tokens.refreshToken, req);
      setAccessCookie(res, tokens.accessToken, req);
      res.json({ ok: true });
    } catch (error: unknown) {
      // Обработка истечения или отзыва токена
      const isProd = env.NODE_ENV === 'production';
      res.clearCookie('refresh_token', {
        path: '/api/auth',
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
      });
      res.clearCookie('access_token', {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
      });

      if (error && typeof error === 'object' && 'name' in error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Refresh token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid refresh token' });
        }
      }
      return res.status(401).json({ error: 'Token verification failed' });
    }
  };

  logout = async (req: Request, res: Response) => {
    const isProd = env.NODE_ENV === 'production';
    res.clearCookie('refresh_token', {
      path: '/api/auth',
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
    });
    res.clearCookie('access_token', { path: '/', httpOnly: true, secure: isProd, sameSite: 'lax' });
    res.status(204).send();
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id as number | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const profile = await this.getProfileById(userId);
      if (!profile) return res.status(404).json({ error: 'Не найдено' });
      res.json({ user: toApiUser(profile) });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        token: z.string().min(1),
      });
      const { token } = schema.parse(req.body);
      await this.authService.verifyEmail(token);
      res.json({ message: 'Email успешно подтвержден' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if (isErrorWithStatus(error) && error.status === 400) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        email: z.string().email('Некорректный email адрес'),
      });
      const { email } = schema.parse(req.body);

      // Запускаем асинхронно, не ждем результата
      // Всегда возвращаем успех для безопасности (не раскрываем существование пользователя)
      this.authService.requestPasswordReset(email).catch((error) => {
        logger.error({ error, email }, 'Ошибка при запросе сброса пароля');
      });

      res.json({
        message:
          'Если указанный email существует, на него отправлено письмо с инструкциями по сбросу пароля',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || 'Некорректные данные' });
      }
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        token: z.string().min(1, 'Токен обязателен'),
        password: z.string().min(1, 'Пароль обязателен'),
      });
      const { token, password } = schema.parse(req.body);

      // Валидация пароля
      const passwordValidation = this.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
      }

      await this.authService.resetPassword(token, password);
      res.json({ message: 'Пароль успешно изменен' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || 'Некорректные данные' });
      }
      if (isErrorWithStatus(error) && error.status === 400) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  };
}
