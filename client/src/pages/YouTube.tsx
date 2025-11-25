import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiJson } from '../lib/api';

interface YouTubeConnectionStatus {
  connected: boolean;
  expiresAt: string | null;
}

interface YouTubePlaylist {
  id: string;
  title: string;
  description: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  itemCount: number | null;
}

interface YouTubePlaylistItem {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

export function YouTube() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<YouTubeConnectionStatus | null>(null);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [likedVideos, setLikedVideos] = useState<YouTubePlaylistItem[]>([]);
  const [watchLater, setWatchLater] = useState<YouTubePlaylistItem[]>([]);
  const [activeTab, setActiveTab] = useState<'playlists' | 'liked' | 'watch-later'>('playlists');
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistItems, setPlaylistItems] = useState<YouTubePlaylistItem[]>([]);

  const checkConnectionStatus = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiJson<YouTubeConnectionStatus>('/api/youtube/auth/status');
      setStatus(data);
      if (data.connected) {
        await loadData();
      }
    } catch (error: any) {
      console.error('Error checking connection status:', error);
      // Если 401, значит не подключен - это нормально
      if (error?.status !== 401) {
        toast.error('Ошибка проверки статуса подключения');
      }
      setStatus({ connected: false, expiresAt: null });
    } finally {
      setLoading(false);
    }
  }, []);

  // Проверка статуса подключения при загрузке
  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  // Обработка callback от OAuth
  useEffect(() => {
    const connected = searchParams.get('youtube_connected');
    const error = searchParams.get('youtube_error');

    if (connected === 'true') {
      toast.success('YouTube успешно подключен!');
      checkConnectionStatus();
      // Очищаем параметры из URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error === 'true') {
      toast.error('Ошибка подключения YouTube');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, checkConnectionStatus]);

  const loadData = async () => {
    try {
      // Загружаем плейлисты
      const playlistsData = await apiJson<{ playlists: YouTubePlaylist[] }>(
        '/api/youtube/playlists',
      );
      setPlaylists(playlistsData.playlists || []);

      // Загружаем лайкнутые видео
      const likedData = await apiJson<{ videos: YouTubePlaylistItem[] }>(
        '/api/youtube/liked?maxResults=50',
      );
      setLikedVideos(likedData.videos || []);

      // Загружаем "Смотреть позже"
      const watchLaterData = await apiJson<{ videos: YouTubePlaylistItem[] }>(
        '/api/youtube/watch-later?maxResults=50',
      );
      setWatchLater(watchLaterData.videos || []);
    } catch (error: any) {
      console.error('Error loading YouTube data:', error);
      const errorMessage = error?.message || 'Ошибка загрузки данных YouTube';
      if (errorMessage.includes('не подключен') || errorMessage.includes('токен истек')) {
        toast.error('YouTube не подключен или токен истек. Пожалуйста, переподключите аккаунт.');
        setStatus({ connected: false, expiresAt: null });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const data = await apiJson<{ authUrl: string }>('/api/youtube/auth/url');
      // Перенаправляем на Google OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Error getting auth URL:', error);
      const status = error?.status;
      if (status === 401 || status === 403) {
        toast.error('Необходима авторизация. Пожалуйста, войдите в систему.');
        // Перенаправляем на страницу входа через небольшую задержку
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        toast.error('Ошибка получения URL авторизации. Попробуйте позже.');
      }
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Вы уверены, что хотите отключить YouTube интеграцию?')) {
      return;
    }

    try {
      await apiJson('/api/youtube/auth/disconnect', {
        method: 'POST',
      });
      toast.success('YouTube интеграция отключена');
      setStatus({ connected: false, expiresAt: null });
      setPlaylists([]);
      setLikedVideos([]);
      setWatchLater([]);
      setPlaylistItems([]);
      setSelectedPlaylist(null);
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast.error('Ошибка отключения YouTube');
    }
  };

  const handlePlaylistClick = async (playlistId: string) => {
    if (selectedPlaylist === playlistId) {
      setSelectedPlaylist(null);
      setPlaylistItems([]);
      return;
    }

    try {
      setSelectedPlaylist(playlistId);
      const data = await apiJson<{ items: YouTubePlaylistItem[] }>(
        `/api/youtube/playlists/${playlistId}/items?maxResults=50`,
      );
      setPlaylistItems(data.items || []);
    } catch (error: any) {
      console.error('Error loading playlist items:', error);
      toast.error('Ошибка загрузки плейлиста');
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <span className="text-textMuted">Загрузка...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!status?.connected) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="card">
          <div className="text-center py-12">
            <div className="mb-6">
              <svg
                className="w-16 h-16 mx-auto text-red-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-text mb-2">Подключите YouTube</h2>
            <p className="text-textMuted mb-6">
              Подключите свой YouTube аккаунт, чтобы просматривать плейлисты, лайкнутые видео и
              многое другое
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn btn-primary px-6 py-3"
            >
              {connecting ? 'Подключение...' : 'Подключить YouTube'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-text mb-1">YouTube</h1>
            <p className="text-sm text-textMuted">
              Подключено{' '}
              {status.expiresAt && new Date(status.expiresAt).toLocaleDateString('ru-RU')}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="btn px-4 py-2 bg-white/90 hover:bg-white border-black/15 hover:border-black/20 text-red-600"
          >
            Отключить
          </button>
        </div>

        {/* Табы */}
        <div className="flex gap-2 mb-6 border-b border-black/10">
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'playlists'
                ? 'text-text border-b-2 border-primary'
                : 'text-textMuted hover:text-text'
            }`}
          >
            Плейлисты ({playlists.length})
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'liked'
                ? 'text-text border-b-2 border-primary'
                : 'text-textMuted hover:text-text'
            }`}
          >
            Лайки ({likedVideos.length})
          </button>
          <button
            onClick={() => setActiveTab('watch-later')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'watch-later'
                ? 'text-text border-b-2 border-primary'
                : 'text-textMuted hover:text-text'
            }`}
          >
            Смотреть позже ({watchLater.length})
          </button>
        </div>

        {/* Контент табов */}
        {activeTab === 'playlists' && (
          <div>
            {playlists.length === 0 ? (
              <div className="text-center py-12 text-textMuted">У вас пока нет плейлистов</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => (
                  <div
                    key={playlist.id}
                    className="border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handlePlaylistClick(playlist.id)}
                  >
                    {playlist.thumbnailUrl && (
                      <img
                        src={playlist.thumbnailUrl}
                        alt={playlist.title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-text mb-1 line-clamp-2">
                        {playlist.title}
                      </h3>
                      {playlist.channelTitle && (
                        <p className="text-sm text-textMuted mb-2">{playlist.channelTitle}</p>
                      )}
                      {playlist.itemCount !== null && (
                        <p className="text-xs text-textMuted">
                          {playlist.itemCount} {playlist.itemCount === 1 ? 'видео' : 'видео'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Элементы выбранного плейлиста */}
            {selectedPlaylist && playlistItems.length > 0 && (
              <div className="mt-6 pt-6 border-t border-black/10">
                <h3 className="text-lg font-semibold text-text mb-4">Видео из плейлиста</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlistItems.map((item) => (
                    <a
                      key={item.id}
                      href={`https://www.youtube.com/watch?v=${item.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {item.thumbnailUrl && (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-32 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <h4 className="font-medium text-text mb-1 line-clamp-2">{item.title}</h4>
                        {item.channelTitle && (
                          <p className="text-sm text-textMuted">{item.channelTitle}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'liked' && (
          <div>
            {likedVideos.length === 0 ? (
              <div className="text-center py-12 text-textMuted">У вас пока нет лайкнутых видео</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {likedVideos.map((video) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {video.thumbnailUrl && (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-medium text-text mb-1 line-clamp-2">{video.title}</h3>
                      {video.channelTitle && (
                        <p className="text-sm text-textMuted">{video.channelTitle}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'watch-later' && (
          <div>
            {watchLater.length === 0 ? (
              <div className="text-center py-12 text-textMuted">
                У вас пока нет видео в &quot;Смотреть позже&quot;
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchLater.map((video) => (
                  <a
                    key={video.id}
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-black/10 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {video.thumbnailUrl && (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-medium text-text mb-1 line-clamp-2">{video.title}</h3>
                      {video.channelTitle && (
                        <p className="text-sm text-textMuted">{video.channelTitle}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
