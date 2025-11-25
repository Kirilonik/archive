import { OAuth2Client } from 'google-auth-library';
import type { YouTubeOAuthRepository, YouTubeOAuthToken } from '../../domain/integrations/youtube-oauth.types.js';
import { logger } from '../../shared/logger.js';
import { env } from '../../config/env.js';

/**
 * Сервис для управления OAuth авторизацией YouTube
 */
export class YouTubeOAuthService {
  private oauth2Client: OAuth2Client;

  constructor(
    private readonly repository: YouTubeOAuthRepository,
    googleClientId: string,
    googleClientSecret: string,
    redirectUri: string,
  ) {
    this.oauth2Client = new OAuth2Client(
      googleClientId,
      googleClientSecret,
      redirectUri,
    );
  }

  /**
   * Получить URL для авторизации
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Для получения refresh token
      scope: scopes,
      prompt: 'consent', // Всегда запрашивать согласие для получения refresh token
      state: state || undefined,
    });
  }

  /**
   * Обменять код авторизации на токены
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date;
    scope: string | null;
  }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('Не удалось получить access token');
      }

      const expiresAt = tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000); // По умолчанию 1 час

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        scope: Array.isArray(tokens.scope) ? tokens.scope.join(' ') : tokens.scope || null,
      };
    } catch (error) {
      logger.error({ err: error }, 'Error exchanging code for tokens');
      throw error;
    }
  }

  /**
   * Сохранить токены пользователя
   */
  async saveUserTokens(
    userId: number,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date,
    scope: string | null,
  ): Promise<YouTubeOAuthToken> {
    return this.repository.saveTokens({
      userId,
      accessToken,
      refreshToken,
      expiresAt,
      scope,
    });
  }

  /**
   * Получить токены пользователя
   */
  async getUserTokens(userId: number): Promise<YouTubeOAuthToken | null> {
    return this.repository.getTokensByUserId(userId);
  }

  /**
   * Обновить access token используя refresh token
   */
  async refreshAccessToken(userId: number): Promise<YouTubeOAuthToken | null> {
    const tokens = await this.repository.getTokensByUserId(userId);
    if (!tokens || !tokens.refreshToken) {
      return null;
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: tokens.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        logger.warn({ userId }, 'Failed to refresh access token');
        return null;
      }

      const expiresAt = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      return this.repository.updateAccessToken(userId, credentials.access_token, expiresAt);
    } catch (error) {
      logger.error({ err: error, userId }, 'Error refreshing access token');
      return null;
    }
  }

  /**
   * Получить валидный access token (обновляет если истек)
   */
  async getValidAccessToken(userId: number): Promise<string | null> {
    const tokens = await this.repository.getTokensByUserId(userId);
    if (!tokens) {
      return null;
    }

    // Проверяем, не истек ли токен (с запасом в 5 минут)
    const now = new Date();
    const expiresAt = new Date(tokens.expiresAt);
    expiresAt.setMinutes(expiresAt.getMinutes() - 5);

    if (now >= expiresAt) {
      // Токен истек или скоро истечет, обновляем
      const updated = await this.refreshAccessToken(userId);
      return updated?.accessToken || null;
    }

    return tokens.accessToken;
  }

  /**
   * Удалить токены пользователя (отключить интеграцию)
   */
  async revokeTokens(userId: number): Promise<void> {
    const tokens = await this.repository.getTokensByUserId(userId);
    if (tokens?.accessToken) {
      try {
        // revokeToken возвращает Promise
        await this.oauth2Client.revokeToken(tokens.accessToken);
      } catch (error) {
        logger.warn({ err: error, userId }, 'Error revoking credentials, deleting anyway');
      }
    }
    await this.repository.deleteTokensByUserId(userId);
  }
}

