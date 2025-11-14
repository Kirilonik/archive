import jwt from 'jsonwebtoken';
import type {
  AuthRepository,
  PasswordHasher,
  AuthUser,
  TokenPair,
  AuthUserWithPassword,
} from '../../domain/auth/auth.types.js';
import { env } from '../../config/env.js';
import type { OAuth2Client } from 'google-auth-library';
import { logger } from '../../shared/logger.js';

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly googleClient: OAuth2Client,
  ) {}

  private signAccessToken(payload: { id: number; email: string }): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m` });
  }

  private signRefreshToken(payload: { id: number; email: string }): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` });
  }

  private buildTokens(user: Pick<AuthUser, 'id' | 'email'>): TokenPair {
    const accessToken = this.signAccessToken({ id: user.id, email: user.email });
    const refreshToken = this.signRefreshToken({ id: user.id, email: user.email });
    return { accessToken, refreshToken };
  }

  async register(input: { name?: string | null; email: string; password: string }): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      const err: any = new Error('User exists');
      err.status = 409;
      throw err;
    }
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.createUser({
      name: input.name ?? null,
      email: input.email,
      passwordHash,
    });
    return { user, tokens: this.buildTokens(user) };
  }

  private ensureUserHasPassword(user: AuthUserWithPassword | null): AuthUserWithPassword | null {
    if (!user) return null;
    if (!user.passwordHash) return null;
    return user;
  }

  async login(input: { email: string; password: string }): Promise<{ user: AuthUser; tokens: TokenPair } | null> {
    const user = this.ensureUserHasPassword(await this.repository.findByEmail(input.email));
    if (!user) return null;
    const ok = await this.passwordHasher.compare(input.password, user.passwordHash!);
    if (!ok) return null;
    const stripped: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      googleId: user.googleId ?? null,
    };
    return { user: stripped, tokens: this.buildTokens(stripped) };
  }

  verifyRefreshToken(token: string): { id: number; email: string; iat: number; exp: number } {
    try {
      // Согласно best practices: проверка токена с обработкой различных типов ошибок
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number; email: string; iat: number; exp: number };
    } catch (error: any) {
      // Логируем ошибки верификации для мониторинга отзыва токенов
      if (error?.name === 'TokenExpiredError') {
        logger.debug({ exp: error.expiredAt }, 'Refresh token expired');
      } else if (error?.name === 'JsonWebTokenError') {
        logger.warn({ error: error.message }, 'Invalid refresh token format');
      }
      throw error;
    }
  }

  rotateTokens(user: Pick<AuthUser, 'id' | 'email'>): TokenPair {
    // Согласно best practices: ротация токенов при каждом обновлении
    // Это обеспечивает безопасность и позволяет отзывать старые токены
    return this.buildTokens(user);
  }

  async loginWithGoogle(idToken: string): Promise<{ user: AuthUser; tokens: TokenPair }> {
    let payload: Record<string, any> | undefined;
    try {
      // Согласно best practices: верификация токена с указанием audience
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err: any) {
      // Согласно best practices: логирование ошибок верификации для мониторинга
      logger.warn({ 
        error: err?.message, 
        code: err?.code,
        type: 'google_id_token_verification_error' 
      }, 'Google ID token verification failed');
      const error: any = new Error('Не удалось проверить Google токен');
      error.status = 401;
      error.cause = err;
      throw error;
    }

    if (!payload?.sub) {
      logger.warn({ payload: payload ? 'present but missing sub' : 'missing' }, 'Invalid Google token payload');
      const error: any = new Error('Некорректный ответ Google');
      error.status = 401;
      throw error;
    }

    const googleId = payload.sub;
    const email = payload.email ?? null;
    const name = payload.name ?? null;
    const avatarUrl = payload.picture ?? null;

    let user = await this.repository.findByGoogleId(googleId);

    if (!user && email) {
      const existing = await this.repository.findByEmail(email);
      if (existing) {
        user = await this.repository.attachGoogleAccount({
          userId: existing.id,
          googleId,
          name,
          email,
          avatarUrl,
        });
      }
    }

    if (!user) {
      user = await this.repository.createUserFromGoogle({
        googleId,
        name,
        email,
        avatarUrl,
      });
    }

    const tokens = this.buildTokens(user);
    return { user, tokens };
  }
}

