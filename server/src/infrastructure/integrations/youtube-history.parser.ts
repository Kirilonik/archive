import type {
  YouTubeHistoryParser,
  YouTubeWatchHistoryItem,
} from '../../domain/integrations/youtube.types.js';
import { logger } from '../../shared/logger.js';

/**
 * Парсер для истории просмотров YouTube из Google Takeout
 */
export class YouTubeHistoryTakeoutParser implements YouTubeHistoryParser {
  /**
   * Парсить JSON файл из Google Takeout
   * Формат: { "Video ID": { "title": "...", "time": "2024-01-01T12:00:00.000Z", ... } }
   */
  parseTakeoutJson(data: unknown): YouTubeWatchHistoryItem[] {
    const items: YouTubeWatchHistoryItem[] = [];

    try {
      if (!data || typeof data !== 'object') {
        logger.warn('Invalid JSON data format for YouTube history');
        return items;
      }

      const dataObj = data as Record<string, any>;

      for (const [key, value] of Object.entries(dataObj)) {
        try {
          // Извлекаем video ID из ключа или из URL в значении
          let videoId = this.extractVideoIdFromKey(key);
          if (!videoId && value?.titleUrl) {
            videoId = this.extractVideoIdFromUrl(value.titleUrl);
          }
          if (!videoId && value?.url) {
            videoId = this.extractVideoIdFromUrl(value.url);
          }

          if (!videoId) {
            logger.debug({ key }, 'Could not extract video ID from entry');
            continue;
          }

          const title = value?.title || value?.name || 'Без названия';
          const channelTitle = value?.subtitles?.[0]?.name || null;
          const timeStr = value?.time || value?.timestamp || value?.date;

          let watchedAt: Date;
          if (timeStr) {
            watchedAt = new Date(timeStr);
            if (isNaN(watchedAt.getTime())) {
              logger.debug({ timeStr }, 'Invalid date format, using current date');
              watchedAt = new Date();
            }
          } else {
            watchedAt = new Date();
          }

          const url = value?.titleUrl || value?.url || `https://www.youtube.com/watch?v=${videoId}`;

          items.push({
            videoId,
            title: String(title),
            channelTitle: channelTitle ? String(channelTitle) : null,
            watchedAt,
            url: String(url),
          });
        } catch (error) {
          logger.warn({ err: error, key }, 'Error parsing YouTube history entry');
        }
      }

      logger.info({ count: items.length }, 'Parsed YouTube history from JSON');
      return items;
    } catch (error) {
      logger.error({ err: error }, 'Error parsing YouTube history JSON');
      return items;
    }
  }

  /**
   * Парсить HTML файл истории просмотров
   * Google Takeout также может экспортировать историю в HTML формате
   */
  parseTakeoutHtml(html: string): YouTubeWatchHistoryItem[] {
    const items: YouTubeWatchHistoryItem[] = [];

    try {
      // Простой парсинг HTML через регулярные выражения
      // Формат: <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
      //           <a href="https://www.youtube.com/watch?v=VIDEO_ID">Название видео</a>
      //           <br>Канал
      //           <br>1 янв. 2024 г.
      //         </div>

      const linkRegex = /<a[^>]+href="https?:\/\/www\.youtube\.com\/watch\?v=([^"&]+)"[^>]*>([^<]+)<\/a>/gi;
      const matches = Array.from(html.matchAll(linkRegex));

      for (const match of matches) {
        const videoId = match[1];
        const title = match[2]?.trim() || 'Без названия';

        // Пытаемся найти дату после ссылки
        const dateMatch = html.substring(match.index || 0).match(/<br>([^<]+)<br>/);
        const dateStr = dateMatch?.[1]?.trim();

        let watchedAt: Date;
        if (dateStr) {
          // Парсим дату в формате "1 янв. 2024 г." или ISO формате
          watchedAt = this.parseDate(dateStr);
        } else {
          watchedAt = new Date();
        }

        items.push({
          videoId,
          title,
          channelTitle: null, // В HTML формате канал может быть в следующей строке
          watchedAt,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }

      logger.info({ count: items.length }, 'Parsed YouTube history from HTML');
      return items;
    } catch (error) {
      logger.error({ err: error }, 'Error parsing YouTube history HTML');
      return items;
    }
  }

  /**
   * Извлечь video ID из ключа (может быть просто ID или URL)
   */
  private extractVideoIdFromKey(key: string): string | null {
    // Если ключ уже является video ID (11 символов)
    if (/^[a-zA-Z0-9_-]{11}$/.test(key)) {
      return key;
    }

    // Если это URL
    return this.extractVideoIdFromUrl(key);
  }

  /**
   * Извлечь video ID из YouTube URL
   */
  private extractVideoIdFromUrl(url: string): string | null {
    if (!url) return null;

    // Различные форматы YouTube URL:
    // https://www.youtube.com/watch?v=VIDEO_ID
    // https://youtu.be/VIDEO_ID
    // https://www.youtube.com/embed/VIDEO_ID
    // https://m.youtube.com/watch?v=VIDEO_ID

    const patterns = [
      /[?&]v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /\/embed\/([a-zA-Z0-9_-]{11})/,
      /\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Парсить дату в различных форматах
   */
  private parseDate(dateStr: string): Date {
    // Пытаемся стандартный ISO формат
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Пытаемся парсить русский формат "1 янв. 2024 г."
    const months: Record<string, number> = {
      янв: 0,
      фев: 1,
      мар: 2,
      апр: 3,
      май: 4,
      июн: 5,
      июл: 6,
      авг: 7,
      сен: 8,
      окт: 9,
      ноя: 10,
      дек: 11,
    };

    const match = dateStr.match(/(\d+)\s+(\w+)\.?\s+(\d+)/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthName = match[2].toLowerCase();
      const year = parseInt(match[3], 10);
      const month = months[monthName];

      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }

    // Если ничего не получилось, возвращаем текущую дату
    logger.debug({ dateStr }, 'Could not parse date, using current date');
    return new Date();
  }
}

