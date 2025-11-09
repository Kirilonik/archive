import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type {
  AuthRepository,
  PasswordHasher,
  AuthUser,
  TokenPair,
  AuthUserWithPassword,
} from '../../domain/auth/auth.types.js';
import { env } from '../../config/env.js';
import type { OAuth2Client } from 'google-auth-library';

interface YandexTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

interface YandexUserInfo {
  id?: string;
  default_email?: string;
  emails?: string[];
  display_name?: string;
  real_name?: string;
  first_name?: string;
  last_name?: string;
  default_avatar_id?: string;
}

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
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number; email: string; iat: number; exp: number };
  }

  rotateTokens(user: Pick<AuthUser, 'id' | 'email'>): TokenPair {
    return this.buildTokens(user);
  }

  async loginWithGoogle(idToken: string): Promise<{ user: AuthUser; tokens: TokenPair }> {
    let payload: Record<string, any> | undefined;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      const error: any = new Error('Не удалось проверить Google токен');
      error.status = 401;
      error.cause = err;
      throw error;
    }

    if (!payload?.sub) {
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

  private buildYandexAvatarUrl(avatarId?: string | null): string | null {
    if (!avatarId) return null;
    return `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200`;
  }

  async loginWithYandex(code: string): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const tokenPayload = await this.exchangeYandexCode(code);
    const userInfo = await this.fetchYandexUserInfo(tokenPayload.access_token);
    if (!userInfo.id) {
      const error: any = new Error('Некорректный ответ от Yandex');
      error.status = 401;
      throw error;
    }
    const yandexId = String(userInfo.id);
    const email = userInfo.default_email ?? userInfo.emails?.[0] ?? null;
    const fallbackName = `${userInfo.first_name ?? ''} ${userInfo.last_name ?? ''}`.trim();
    const name = userInfo.real_name ?? userInfo.display_name ?? (fallbackName.length > 0 ? fallbackName : null);
    const avatarUrl = this.buildYandexAvatarUrl(userInfo.default_avatar_id);

    let user = await this.repository.findByYandexId(yandexId);

    if (!user && email) {
      const existing = await this.repository.findByEmail(email);
      if (existing) {
        user = await this.repository.attachYandexAccount({
          userId: existing.id,
          yandexId,
          name,
          email,
          avatarUrl,
        });
      }
    }

    if (!user) {
      user = await this.repository.createUserFromYandex({
        yandexId,
        name,
        email,
        avatarUrl,
      });
    }

    const tokens = this.buildTokens(user);
    return { user, tokens };
  }

  private async exchangeYandexCode(code: string): Promise<YandexTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.YANDEX_CLIENT_ID,
      client_secret: env.YANDEX_CLIENT_SECRET,
      redirect_uri: env.YANDEX_REDIRECT_URI,
    });
    const response = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const error: any = new Error('Не удалось обменять код Yandex на токен');
      error.status = 401;
      error.details = errorPayload;
      throw error;
    }
    return response.json() as Promise<YandexTokenResponse>;
  }

  private async fetchYandexUserInfo(accessToken: string): Promise<YandexUserInfo> {
    const response = await fetch('https://login.yandex.ru/info?format=json', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const error: any = new Error('Не удалось получить данные пользователя Yandex');
      error.status = 401;
      error.details = errorPayload;
      throw error;
    }
    return response.json() as Promise<YandexUserInfo>;
  }
}

