/**
 * Типы для интеграции с YouTube API и обработки истории просмотров
 */

/**
 * Метаданные видео из YouTube API
 */
export type YouTubeVideoDetails = {
  videoId: string;
  title: string;
  description: string | null;
  channelTitle: string | null;
  channelId: string | null;
  publishedAt: string | null;
  duration: number | null; // в секундах
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  thumbnailUrl: string | null;
  tags: string[] | null;
  categoryId: string | null;
  defaultLanguage: string | null;
};

/**
 * Запись из истории просмотров YouTube
 */
export type YouTubeWatchHistoryItem = {
  videoId: string;
  title: string;
  channelTitle: string | null;
  watchedAt: Date;
  url: string;
};

/**
 * Статистика просмотров YouTube
 */
export type YouTubeWatchStats = {
  totalVideos: number;
  uniqueVideos: number;
  totalWatchTime: number; // в секундах
  averageWatchTime: number; // в секундах
  videosByChannel: Record<string, number>;
  videosByDate: Record<string, number>; // дата -> количество просмотров
  topVideos: Array<{
    videoId: string;
    title: string;
    watchCount: number;
  }>;
};

/**
 * Результат обработки истории просмотров
 */
export type YouTubeHistoryProcessResult = {
  items: YouTubeWatchHistoryItem[];
  stats: YouTubeWatchStats;
  enrichedVideos: Map<string, YouTubeVideoDetails>; // videoId -> details
};

/**
 * Плейлист YouTube
 */
export type YouTubePlaylist = {
  id: string;
  title: string;
  description: string | null;
  channelId: string | null;
  channelTitle: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  itemCount: number | null;
};

/**
 * Элемент плейлиста
 */
export type YouTubePlaylistItem = {
  id: string;
  videoId: string;
  title: string;
  description: string | null;
  channelTitle: string | null;
  channelId: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  position: number | null;
  addedAt: string | null;
};

/**
 * Интерфейс клиента YouTube API
 */
export interface YouTubeClient {
  /**
   * Получить детали видео по ID (использует API ключ)
   */
  fetchVideoDetails(videoId: string): Promise<YouTubeVideoDetails | null>;

  /**
   * Получить детали нескольких видео за один запрос (использует API ключ)
   */
  fetchMultipleVideoDetails(videoIds: string[]): Promise<Map<string, YouTubeVideoDetails>>;

  /**
   * Получить детали видео с OAuth токеном пользователя
   */
  fetchVideoDetailsWithAuth(
    videoId: string,
    accessToken: string,
  ): Promise<YouTubeVideoDetails | null>;

  /**
   * Получить плейлисты пользователя
   */
  fetchUserPlaylists(accessToken: string, maxResults?: number): Promise<YouTubePlaylist[]>;

  /**
   * Получить элементы плейлиста
   */
  fetchPlaylistItems(
    playlistId: string,
    accessToken: string,
    maxResults?: number,
  ): Promise<YouTubePlaylistItem[]>;

  /**
   * Получить лайкнутые видео пользователя
   */
  fetchLikedVideos(accessToken: string, maxResults?: number): Promise<YouTubePlaylistItem[]>;

  /**
   * Получить избранные видео пользователя (watch later)
   */
  fetchWatchLaterVideos(accessToken: string, maxResults?: number): Promise<YouTubePlaylistItem[]>;
}

/**
 * Интерфейс парсера истории просмотров
 */
export interface YouTubeHistoryParser {
  /**
   * Парсить JSON файл из Google Takeout
   */
  parseTakeoutJson(data: unknown): YouTubeWatchHistoryItem[];

  /**
   * Парсить HTML файл истории просмотров (альтернативный формат)
   */
  parseTakeoutHtml(html: string): YouTubeWatchHistoryItem[];
}
