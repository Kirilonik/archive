import type { Request, Response, NextFunction } from 'express';
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

