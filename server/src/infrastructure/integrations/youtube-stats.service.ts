import type {
  YouTubeWatchHistoryItem,
  YouTubeWatchStats,
  YouTubeVideoDetails,
  YouTubeHistoryProcessResult,
  YouTubeClient,
} from '../../domain/integrations/youtube.types.js';
import { logger } from '../../shared/logger.js';

/**
 * Сервис для обработки истории просмотров YouTube и расчета статистики
 */
export class YouTubeStatsService {
  constructor(private readonly youtubeClient: YouTubeClient) {}

  /**
   * Обработать историю просмотров и обогатить метаданными
   */
  async processHistory(
    items: YouTubeWatchHistoryItem[],
    enrichWithDetails = true,
  ): Promise<YouTubeHistoryProcessResult> {
    logger.info({ count: items.length }, 'Processing YouTube watch history');

    // Получаем уникальные video ID
    const uniqueVideoIds = Array.from(new Set(items.map((item) => item.videoId)));

    // Обогащаем метаданными через YouTube API
    const enrichedVideos = new Map<string, YouTubeVideoDetails>();
    if (enrichWithDetails && uniqueVideoIds.length > 0) {
      logger.info(
        { uniqueCount: uniqueVideoIds.length },
        'Enriching videos with YouTube API metadata',
      );
      const details = await this.youtubeClient.fetchMultipleVideoDetails(uniqueVideoIds);
      enrichedVideos.clear();
      details.forEach((value, key) => enrichedVideos.set(key, value));
    }

    // Рассчитываем статистику
    const stats = this.calculateStats(items, enrichedVideos);

    return {
      items,
      stats,
      enrichedVideos,
    };
  }

  /**
   * Рассчитать статистику по истории просмотров
   */
  private calculateStats(
    items: YouTubeWatchHistoryItem[],
    enrichedVideos: Map<string, YouTubeVideoDetails>,
  ): YouTubeWatchStats {
    const totalVideos = items.length;
    const uniqueVideos = new Set(items.map((item) => item.videoId)).size;

    // Подсчет по каналам
    const videosByChannel: Record<string, number> = {};
    for (const item of items) {
      const channel = item.channelTitle || 'Неизвестный канал';
      videosByChannel[channel] = (videosByChannel[channel] || 0) + 1;
    }

    // Подсчет по датам
    const videosByDate: Record<string, number> = {};
    for (const item of items) {
      const dateKey = item.watchedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      videosByDate[dateKey] = (videosByDate[dateKey] || 0) + 1;
    }

    // Общее время просмотра (суммируем длительность всех уникальных видео)
    let totalWatchTime = 0;
    const watchedVideoIds = new Set(items.map((item) => item.videoId));
    for (const videoId of watchedVideoIds) {
      const details = enrichedVideos.get(videoId);
      if (details?.duration) {
        totalWatchTime += details.duration;
      }
    }

    const averageWatchTime = uniqueVideos > 0 ? Math.round(totalWatchTime / uniqueVideos) : 0;

    // Топ просмотренных видео
    const videoCounts = new Map<string, { videoId: string; title: string; watchCount: number }>();
    for (const item of items) {
      const existing = videoCounts.get(item.videoId);
      if (existing) {
        existing.watchCount += 1;
      } else {
        videoCounts.set(item.videoId, {
          videoId: item.videoId,
          title: item.title,
          watchCount: 1,
        });
      }
    }

    const topVideos = Array.from(videoCounts.values())
      .sort((a, b) => b.watchCount - a.watchCount)
      .slice(0, 20); // Топ 20

    return {
      totalVideos,
      uniqueVideos,
      totalWatchTime,
      averageWatchTime,
      videosByChannel,
      videosByDate,
      topVideos,
    };
  }
}
