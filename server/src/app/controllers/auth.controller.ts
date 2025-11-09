import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AuthService } from '../../application/auth/auth.service.js';
import { env } from '../../config/env.js';

function setRefreshCookie(res: Response, token: string) {
  const isProd = env.NODE_ENV === 'production';
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function setAccessCookie(res: Response, token: string) {
  const isProd = env.NODE_ENV === 'production';
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
  });
}

function toApiUser(user: { id: number; email: string; name: string | null; avatarUrl: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatarUrl,
  };
}

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly getProfileById: (userId: number) => Promise<{ id: number; email: string; name: string | null; avatarUrl: string | null } | null>,
  ) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().optional(),
        email: z.string().email(),
        password: z.string().min(6),
      });
      const { name, email, password } = schema.parse(req.body);
      const { user, tokens } = await this.authService.register({ name: name ?? null, email, password });
      setRefreshCookie(res, tokens.refreshToken);
      setAccessCookie(res, tokens.accessToken);
      res.status(201).json({ user: toApiUser(user) });
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
      const result = await this.authService.login({ email, password });
      if (!result) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
      setRefreshCookie(res, result.tokens.refreshToken);
      setAccessCookie(res, result.tokens.accessToken);
      res.json({ user: toApiUser(result.user) });
    } catch (error) {
      if (error instanceof z.ZodError) {
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
      setRefreshCookie(res, result.tokens.refreshToken);
      setAccessCookie(res, result.tokens.accessToken);
      res.json({ user: toApiUser(result.user) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.message });
      }
      if ((error as any)?.status === 401) {
        return res.status(401).json({ error: 'Не удалось подтвердить Google аккаунт' });
      }
      next(error);
    }
  };

  yandexStart = (req: Request, res: Response) => {
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie('ya_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/api/auth/yandex',
      maxAge: 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.YANDEX_CLIENT_ID,
      redirect_uri: env.YANDEX_REDIRECT_URI,
      state,
      scope: 'login:email login:info',
    });

    res.redirect(`https://oauth.yandex.ru/authorize?${params.toString()}`);
  };

  yandexCallback = async (req: Request, res: Response) => {
    const { code, state, error } = req.query;
    const expectedState = (req.cookies?.ya_oauth_state ?? (req as any).cookies?.ya_oauth_state) as string | undefined;
    if (expectedState) {
      res.clearCookie('ya_oauth_state', { path: '/api/auth/yandex' });
    }

    const redirectUrl = new URL(env.FRONTEND_URL ?? 'http://localhost:5173');

    if (error) {
      redirectUrl.searchParams.set('auth_error', String(error));
      return res.redirect(redirectUrl.toString());
    }

    if (!code || typeof code !== 'string' || !state || state !== expectedState) {
      redirectUrl.searchParams.set('auth_error', 'invalid_state');
      return res.redirect(redirectUrl.toString());
    }

    try {
      const result = await this.authService.loginWithYandex(code);
      setRefreshCookie(res, result.tokens.refreshToken);
      setAccessCookie(res, result.tokens.accessToken);
      redirectUrl.searchParams.set('auth_success', 'yandex');
      return res.redirect(redirectUrl.toString());
    } catch (err: any) {
      redirectUrl.searchParams.set('auth_error', err?.message ?? 'yandex_failed');
      return res.redirect(redirectUrl.toString());
    }
  };

  refresh = async (req: Request, res: Response) => {
    const token = (req as any).cookies?.refresh_token || req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh' });
    try {
      const payload = this.authService.verifyRefreshToken(token);
      const user = await this.getProfileById(payload.id);
      if (!user) return res.status(401).json({ error: 'Invalid refresh' });
      const tokens = this.authService.rotateTokens(user);
      setRefreshCookie(res, tokens.refreshToken);
      setAccessCookie(res, tokens.accessToken);
      res.json({ ok: true });
    } catch {
      res.status(401).json({ error: 'Invalid refresh' });
    }
  };

  logout = async (req: Request, res: Response) => {
    const isProd = env.NODE_ENV === 'production';
    res.clearCookie('refresh_token', { path: '/api/auth', httpOnly: true, secure: isProd, sameSite: 'lax' });
    res.clearCookie('access_token', { path: '/', httpOnly: true, secure: isProd, sameSite: 'lax' });
    res.status(204).send();
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as number | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const profile = await this.getProfileById(userId);
      if (!profile) return res.status(404).json({ error: 'Не найдено' });
      res.json({ user: toApiUser(profile) });
    } catch (error) {
      next(error);
    }
  };
}

