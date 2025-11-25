import { env } from '../../config/env.js';
import type {
  YouTubeClient,
  YouTubeVideoDetails,
  YouTubePlaylist,
  YouTubePlaylistItem,
} from '../../domain/integrations/youtube.types.js';
import { logger } from '../../shared/logger.js';

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const API_KEY = env.YOUTUBE_API_KEY;

/**
 * HTTP клиент для работы с YouTube Data API v3
 */
export class YouTubeHttpClient implements YouTubeClient {
  private async fetchJson<T>(url: string, retries = 2): Promise<T | null> {
    const timeoutMs = 30000; // 30 секунд
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      logger.debug({ url }, '[youtube] Making request');

      const resp = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        logger.error(
          {
            status: resp.status,
            statusText: resp.statusText,
            url,
            body: body.substring(0, 500),
          },
          '[youtube] request failed',
        );
        return null;
      }

      const responseText = await resp.text();
      if (!responseText || responseText.trim() === '') {
        logger.warn({ url, status: resp.status }, '[youtube] Empty response body');
        return null;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (parseError) {
        logger.error(
          {
            url,
            status: resp.status,
            body: responseText.substring(0, 500),
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
          },
          '[youtube] Failed to parse JSON response',
        );
        return null;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (
        retries > 0 &&
        (error?.name === 'AbortError' ||
          error?.code === 'ETIMEDOUT' ||
          error?.code === 'ECONNRESET' ||
          error?.message?.includes('timeout'))
      ) {
        logger.warn(
          { url, retriesLeft: retries, error: error.message },
          'YouTube request timeout, retrying',
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchJson<T>(url, retries - 1);
      }

      logger.error({ err: error, url, retries }, 'Error fetching from YouTube API');
      return null;
    }
  }

  /**
   * Преобразует ISO 8601 длительность (например, PT1H2M10S) в секунды
   */
  private parseDuration(duration: string | null | undefined): number | null {
    if (!duration) return null;
    try {
      // Формат: PT1H2M10S (Period Time: 1 час, 2 минуты, 10 секунд)
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return null;

      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);

      return hours * 3600 + minutes * 60 + seconds;
    } catch {
      return null;
    }
  }

  /**
   * Получить детали одного видео
   */
  async fetchVideoDetails(videoId: string): Promise<YouTubeVideoDetails | null> {
    if (!API_KEY) {
      logger.warn('YOUTUBE_API_KEY is not set');
      return null;
    }

    if (!videoId) {
      logger.warn({ videoId }, 'fetchVideoDetails: videoId is missing');
      return null;
    }

    try {
      const url = new URL(`${YOUTUBE_API_URL}/videos`);
      url.searchParams.set('id', videoId);
      url.searchParams.set('key', API_KEY);
      url.searchParams.set('part', 'snippet,statistics,contentDetails');
      url.searchParams.set('maxResults', '1');

      const data = await this.fetchJson<{
        items?: Array<{
          id: string;
          snippet?: {
            title?: string;
            description?: string;
            channelTitle?: string;
            channelId?: string;
            publishedAt?: string;
            thumbnails?: {
              default?: { url?: string };
              medium?: { url?: string };
              high?: { url?: string };
            };
            tags?: string[];
            categoryId?: string;
            defaultLanguage?: string;
          };
          statistics?: {
            viewCount?: string;
            likeCount?: string;
            commentCount?: string;
          };
          contentDetails?: {
            duration?: string;
          };
        }>;
      }>(url.toString());

      const item = data?.items?.[0];
      if (!item) {
        logger.debug({ videoId }, 'Video not found in YouTube API');
        return null;
      }

      const snippet = item.snippet;
      const statistics = item.statistics;
      const contentDetails = item.contentDetails;

      return {
        videoId: item.id,
        title: snippet?.title || 'Без названия',
        description: snippet?.description || null,
        channelTitle: snippet?.channelTitle || null,
        channelId: snippet?.channelId || null,
        publishedAt: snippet?.publishedAt || null,
        duration: this.parseDuration(contentDetails?.duration),
        viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : null,
        likeCount: statistics?.likeCount ? parseInt(statistics.likeCount, 10) : null,
        commentCount: statistics?.commentCount ? parseInt(statistics.commentCount, 10) : null,
        thumbnailUrl:
          snippet?.thumbnails?.high?.url ||
          snippet?.thumbnails?.medium?.url ||
          snippet?.thumbnails?.default?.url ||
          null,
        tags: snippet?.tags && snippet.tags.length > 0 ? snippet.tags : null,
        categoryId: snippet?.categoryId || null,
        defaultLanguage: snippet?.defaultLanguage || null,
      };
    } catch (error) {
      logger.error({ err: error, videoId }, 'Error fetching YouTube video details');
      return null;
    }
  }

  /**
   * Вспомогательный метод для запросов с OAuth токеном
   */
  private async fetchJsonWithAuth<T>(
    url: string,
    accessToken: string,
    retries = 2,
  ): Promise<T | null> {
    const timeoutMs = 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      logger.debug({ url }, '[youtube] Making OAuth request');

      const resp = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.status === 401) {
        logger.warn({ url }, '[youtube] OAuth token expired or invalid');
        return null;
      }

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        logger.error(
          {
            status: resp.status,
            statusText: resp.statusText,
            url,
            body: body.substring(0, 500),
          },
          '[youtube] OAuth request failed',
        );
        return null;
      }

      const responseText = await resp.text();
      if (!responseText || responseText.trim() === '') {
        logger.warn({ url, status: resp.status }, '[youtube] Empty OAuth response body');
        return null;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (parseError) {
        logger.error(
          {
            url,
            status: resp.status,
            body: responseText.substring(0, 500),
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
          },
          '[youtube] Failed to parse OAuth JSON response',
        );
        return null;
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (
        retries > 0 &&
        (error?.name === 'AbortError' ||
          error?.code === 'ETIMEDOUT' ||
          error?.code === 'ECONNRESET' ||
          error?.message?.includes('timeout'))
      ) {
        logger.warn(
          { url, retriesLeft: retries, error: error.message },
          'YouTube OAuth request timeout, retrying',
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.fetchJsonWithAuth<T>(url, accessToken, retries - 1);
      }

      logger.error({ err: error, url, retries }, 'Error fetching from YouTube API with OAuth');
      return null;
    }
  }

  /**
   * Получить детали видео с OAuth токеном
   */
  async fetchVideoDetailsWithAuth(
    videoId: string,
    accessToken: string,
  ): Promise<YouTubeVideoDetails | null> {
    if (!videoId || !accessToken) {
      return null;
    }

    try {
      const url = new URL(`${YOUTUBE_API_URL}/videos`);
      url.searchParams.set('id', videoId);
      url.searchParams.set('part', 'snippet,statistics,contentDetails');
      url.searchParams.set('maxResults', '1');

      const data = await this.fetchJsonWithAuth<{
        items?: Array<{
          id: string;
          snippet?: {
            title?: string;
            description?: string;
            channelTitle?: string;
            channelId?: string;
            publishedAt?: string;
            thumbnails?: {
              default?: { url?: string };
              medium?: { url?: string };
              high?: { url?: string };
            };
            tags?: string[];
            categoryId?: string;
            defaultLanguage?: string;
          };
          statistics?: {
            viewCount?: string;
            likeCount?: string;
            commentCount?: string;
          };
          contentDetails?: {
            duration?: string;
          };
        }>;
      }>(url.toString(), accessToken);

      const item = data?.items?.[0];
      if (!item) {
        return null;
      }

      const snippet = item.snippet;
      const statistics = item.statistics;
      const contentDetails = item.contentDetails;

      return {
        videoId: item.id,
        title: snippet?.title || 'Без названия',
        description: snippet?.description || null,
        channelTitle: snippet?.channelTitle || null,
        channelId: snippet?.channelId || null,
        publishedAt: snippet?.publishedAt || null,
        duration: this.parseDuration(contentDetails?.duration),
        viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : null,
        likeCount: statistics?.likeCount ? parseInt(statistics.likeCount, 10) : null,
        commentCount: statistics?.commentCount ? parseInt(statistics.commentCount, 10) : null,
        thumbnailUrl:
          snippet?.thumbnails?.high?.url ||
          snippet?.thumbnails?.medium?.url ||
          snippet?.thumbnails?.default?.url ||
          null,
        tags: snippet?.tags && snippet.tags.length > 0 ? snippet.tags : null,
        categoryId: snippet?.categoryId || null,
        defaultLanguage: snippet?.defaultLanguage || null,
      };
    } catch (error) {
      logger.error({ err: error, videoId }, 'Error fetching YouTube video details with OAuth');
      return null;
    }
  }

  /**
   * Получить плейлисты пользователя
   */
  async fetchUserPlaylists(
    accessToken: string,
    maxResults = 50,
  ): Promise<YouTubePlaylist[]> {
    if (!accessToken) {
      return [];
    }

    try {
      const url = new URL(`${YOUTUBE_API_URL}/playlists`);
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('mine', 'true');
      url.searchParams.set('maxResults', String(Math.min(maxResults, 50)));

      const data = await this.fetchJsonWithAuth<{
        items?: Array<{
          id: string;
          snippet?: {
            title?: string;
            description?: string;
            channelId?: string;
            channelTitle?: string;
            publishedAt?: string;
            thumbnails?: {
              default?: { url?: string };
              medium?: { url?: string };
              high?: { url?: string };
            };
          };
          contentDetails?: {
            itemCount?: number;
          };
        }>;
      }>(url.toString(), accessToken);

      if (!data?.items) {
        return [];
      }

      return data.items.map((item) => ({
        id: item.id,
        title: item.snippet?.title || 'Без названия',
        description: item.snippet?.description || null,
        channelId: item.snippet?.channelId || null,
        channelTitle: item.snippet?.channelTitle || null,
        publishedAt: item.snippet?.publishedAt || null,
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          null,
        itemCount: item.contentDetails?.itemCount || null,
      }));
    } catch (error) {
      logger.error({ err: error }, 'Error fetching user playlists');
      return [];
    }
  }

  /**
   * Получить элементы плейлиста
   */
  async fetchPlaylistItems(
    playlistId: string,
    accessToken: string,
    maxResults = 50,
  ): Promise<YouTubePlaylistItem[]> {
    if (!playlistId || !accessToken) {
      return [];
    }

    try {
      const url = new URL(`${YOUTUBE_API_URL}/playlistItems`);
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('maxResults', String(Math.min(maxResults, 50)));

      const data = await this.fetchJsonWithAuth<{
        items?: Array<{
          id: string;
          snippet?: {
            title?: string;
            description?: string;
            channelTitle?: string;
            channelId?: string;
            publishedAt?: string;
            thumbnails?: {
              default?: { url?: string };
              medium?: { url?: string };
              high?: { url?: string };
            };
            position?: number;
          };
          contentDetails?: {
            videoId?: string;
            videoPublishedAt?: string;
          };
        }>;
      }>(url.toString(), accessToken);

      if (!data?.items) {
        return [];
      }

      return data.items
        .filter((item) => item.contentDetails?.videoId) // Только видео, не удаленные
        .map((item) => ({
          id: item.id,
          videoId: item.contentDetails!.videoId!,
          title: item.snippet?.title || 'Без названия',
          description: item.snippet?.description || null,
          channelTitle: item.snippet?.channelTitle || null,
          channelId: item.snippet?.channelId || null,
          publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || null,
          thumbnailUrl:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            null,
          position: item.snippet?.position || null,
          addedAt: item.snippet?.publishedAt || null,
        }));
    } catch (error) {
      logger.error({ err: error, playlistId }, 'Error fetching playlist items');
      return [];
    }
  }

  /**
   * Получить лайкнутые видео пользователя
   * Использует специальный плейлист "LL" (Liked videos)
   */
  async fetchLikedVideos(
    accessToken: string,
    maxResults = 50,
  ): Promise<YouTubePlaylistItem[]> {
    // "LL" - это специальный ID для плейлиста лайкнутых видео
    return this.fetchPlaylistItems('LL', accessToken, maxResults);
  }

  /**
   * Получить видео из "Смотреть позже"
   * Использует специальный плейлист "WL" (Watch Later)
   */
  async fetchWatchLaterVideos(
    accessToken: string,
    maxResults = 50,
  ): Promise<YouTubePlaylistItem[]> {
    // "WL" - это специальный ID для плейлиста "Смотреть позже"
    return this.fetchPlaylistItems('WL', accessToken, maxResults);
  }

  /**
   * Получить детали нескольких видео (YouTube API позволяет до 50 за запрос)
   */
  async fetchMultipleVideoDetails(
    videoIds: string[],
  ): Promise<Map<string, YouTubeVideoDetails>> {
    if (!API_KEY) {
      logger.warn('YOUTUBE_API_KEY is not set');
      return new Map();
    }

    if (!videoIds || videoIds.length === 0) {
      return new Map();
    }

    const result = new Map<string, YouTubeVideoDetails>();
    const batchSize = 50; // YouTube API ограничение

    // Разбиваем на батчи по 50 видео
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);

      try {
        const url = new URL(`${YOUTUBE_API_URL}/videos`);
        url.searchParams.set('id', batch.join(','));
        url.searchParams.set('key', API_KEY);
        url.searchParams.set('part', 'snippet,statistics,contentDetails');
        url.searchParams.set('maxResults', String(batchSize));

        const data = await this.fetchJson<{
          items?: Array<{
            id: string;
            snippet?: {
              title?: string;
              description?: string;
              channelTitle?: string;
              channelId?: string;
              publishedAt?: string;
              thumbnails?: {
                default?: { url?: string };
                medium?: { url?: string };
                high?: { url?: string };
              };
              tags?: string[];
              categoryId?: string;
              defaultLanguage?: string;
            };
            statistics?: {
              viewCount?: string;
              likeCount?: string;
              commentCount?: string;
            };
            contentDetails?: {
              duration?: string;
            };
          }>;
        }>(url.toString());

        if (data?.items) {
          for (const item of data.items) {
            const snippet = item.snippet;
            const statistics = item.statistics;
            const contentDetails = item.contentDetails;

            const details: YouTubeVideoDetails = {
              videoId: item.id,
              title: snippet?.title || 'Без названия',
              description: snippet?.description || null,
              channelTitle: snippet?.channelTitle || null,
              channelId: snippet?.channelId || null,
              publishedAt: snippet?.publishedAt || null,
              duration: this.parseDuration(contentDetails?.duration),
              viewCount: statistics?.viewCount ? parseInt(statistics.viewCount, 10) : null,
              likeCount: statistics?.likeCount ? parseInt(statistics.likeCount, 10) : null,
              commentCount: statistics?.commentCount
                ? parseInt(statistics.commentCount, 10)
                : null,
              thumbnailUrl:
                snippet?.thumbnails?.high?.url ||
                snippet?.thumbnails?.medium?.url ||
                snippet?.thumbnails?.default?.url ||
                null,
              tags: snippet?.tags && snippet.tags.length > 0 ? snippet.tags : null,
              categoryId: snippet?.categoryId || null,
              defaultLanguage: snippet?.defaultLanguage || null,
            };

            result.set(item.id, details);
          }
        }

        // Небольшая задержка между батчами, чтобы не превысить rate limit
        if (i + batchSize < videoIds.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.error({ err: error, batch: batch.slice(0, 5) }, 'Error fetching YouTube video batch');
      }
    }

    return result;
  }
}

