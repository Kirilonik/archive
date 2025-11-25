/**
 * Типы для OAuth интеграции с YouTube
 */

export interface YouTubeOAuthToken {
  id: number;
  userId: number;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string | null;
  tokenType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface YouTubeOAuthTokenInput {
  userId: number;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date;
  scope?: string | null;
  tokenType?: string;
}

export interface YouTubeOAuthRepository {
  /**
   * Сохранить или обновить OAuth токены пользователя
   */
  saveTokens(input: YouTubeOAuthTokenInput): Promise<YouTubeOAuthToken>;

  /**
   * Получить токены пользователя
   */
  getTokensByUserId(userId: number): Promise<YouTubeOAuthToken | null>;

  /**
   * Удалить токены пользователя
   */
  deleteTokensByUserId(userId: number): Promise<void>;

  /**
   * Обновить access token
   */
  updateAccessToken(
    userId: number,
    accessToken: string,
    expiresAt: Date,
  ): Promise<YouTubeOAuthToken | null>;
}
