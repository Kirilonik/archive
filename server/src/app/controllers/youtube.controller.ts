import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { YouTubeOAuthService } from '../../application/youtube/youtube-oauth.service.js';
import type { YouTubeHttpClient } from '../../infrastructure/integrations/youtube.client.js';
import { logger } from '../../shared/logger.js';
import { env } from '../../config/env.js';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export class YouTubeController {
  constructor(
    private readonly oauthService: YouTubeOAuthService,
    private readonly youtubeClient: YouTubeHttpClient,
  ) {}

  /**
   * Получить URL для авторизации YouTube
   */
  getAuthUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId; // Из auth middleware
      if (!userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
      }

      const state = `${userId}-${Date.now()}`; // Защита от CSRF
      const authUrl = this.oauthService.getAuthUrl(state);

      res.json({ authUrl, state });
    } catch (error) {
      logger.error({ err: error }, 'Error generating YouTube auth URL');
      next(error);
    }
  };

  /**
   * Обработка callback от Google OAuth
   */
  handleCallback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        code: z.string().min(1),
        state: z.string().optional(),
      });

      const { code, state } = schema.parse(req.query);
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
      }

      // Обмениваем код на токены
      const tokens = await this.oauthService.exchangeCodeForTokens(code);

      // Сохраняем токены
      await this.oauthService.saveUserTokens(
        userId,
        tokens.accessToken,
        tokens.refreshToken,
        tokens.expiresAt,
        tokens.scope,
      );

      // Редирект на фронтенд с успехом
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/profile?youtube_connected=true`);
    } catch (error) {
      logger.error({ err: error }, 'Error handling YouTube OAuth callback');
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/profile?youtube_error=true`);
    }
  };

  /**
   * Получить статус подключения YouTube
   */
  getConnectionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
      }

      const tokens = await this.oauthService.getUserTokens(userId);
      const isConnected = !!tokens;

      res.json({
        connected: isConnected,
        expiresAt: tokens?.expiresAt || null,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error getting YouTube connection status');
      next(error);
    }
  };

  /**
   * Отключить YouTube интеграцию
   */
  disconnect = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
      }

      await this.oauthService.revokeTokens(userId);

      res.json({ success: true, message: 'YouTube интеграция отключена' });
    } catch (error) {
      logger.error({ err: error }, 'Error disconnecting YouTube');
      next(error);
    }
  };

  /**
   * Получить плейлисты пользователя
   */
  getPlaylists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
      }

      const accessToken = await this.oauthService.getValidAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ error: 'YouTube не подключен или токен истек' });
      }

      const maxResults = req.query.maxResults
        ? parseInt(String(req.query.maxResults), 10)
        : 50;

      const playlists = await this.youtubeClient.fetchUserPlaylists(accessToken, maxResults);

      res.json({ playlists });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching playlists');
      next(error);
    }
  };

  /**
   * Получить лайкнутые видео
   */
  getLikedVideos = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
      }

      const accessToken = await this.oauthService.getValidAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ error: 'YouTube не подключен или токен истек' });
      }

      const maxResults = req.query.maxResults
        ? parseInt(String(req.query.maxResults), 10)
        : 50;

      const videos = await this.youtubeClient.fetchLikedVideos(accessToken, maxResults);

      res.json({ videos });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching liked videos');
      next(error);
    }
  };

  /**
   * Получить видео из "Смотреть позже"
   */
  getWatchLater = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
      }

      const accessToken = await this.oauthService.getValidAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ error: 'YouTube не подключен или токен истек' });
      }

      const maxResults = req.query.maxResults
        ? parseInt(String(req.query.maxResults), 10)
        : 50;

      const videos = await this.youtubeClient.fetchWatchLaterVideos(accessToken, maxResults);

      res.json({ videos });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching watch later videos');
      next(error);
    }
  };

  /**
   * Получить элементы плейлиста
   */
  getPlaylistItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        playlistId: z.string().min(1),
      });

      const { playlistId } = schema.parse(req.params);
      const userId = (req as any).userId;

      if (!userId) {
        return res.status(401).json({ error: 'Необходима авторизация' });
      }

      const accessToken = await this.oauthService.getValidAccessToken(userId);
      if (!accessToken) {
        return res.status(401).json({ error: 'YouTube не подключен или токен истек' });
      }

      const maxResults = req.query.maxResults
        ? parseInt(String(req.query.maxResults), 10)
        : 50;

      const items = await this.youtubeClient.fetchPlaylistItems(playlistId, accessToken, maxResults);

      res.json({ items });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching playlist items');
      next(error);
    }
  };
}

