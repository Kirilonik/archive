# Интеграция с YouTube для сбора статистики просмотров

## Обзор

Интеграция позволяет собирать и анализировать данные YouTube пользователя. Реализованы два подхода:

1. **OAuth 2.0 авторизация** (рекомендуется) - пользователь авторизуется через Google и предоставляет доступ к своим данным YouTube
2. **Парсинг экспорта из Google Takeout** - альтернативный способ для полной истории просмотров
3. **YouTube Data API v3** - получение метаданных и статистики по известным ID видео

## ⚠️ Важное ограничение

YouTube Data API v3 **не предоставляет прямой доступ** к истории просмотров пользователя даже через OAuth (политика конфиденциальности). Однако через OAuth можно получить:

- Плейлисты пользователя
- Лайкнутые видео
- Видео из "Смотреть позже"
- Метаданные всех видео

## Настройка

### 1. Настройка Google OAuth (для OAuth авторизации)

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите **YouTube Data API v3**
4. Перейдите в "Credentials" → "Create Credentials" → "OAuth client ID"
5. Выберите тип приложения: "Web application"
6. Добавьте Authorized redirect URIs:
   - `http://localhost:3000/api/youtube/auth/callback` (для разработки)
   - `https://yourdomain.com/api/youtube/auth/callback` (для продакшена)
7. Сохраните Client ID и Client Secret
8. Добавьте в переменные окружения:

```bash
GOOGLE_CLIENT_ID=ваш_client_id
GOOGLE_CLIENT_SECRET=ваш_client_secret
API_BASE_URL=http://localhost:3000  # или ваш продакшен URL
```

### 2. Получение YouTube API ключа (опционально, для публичных запросов)

1. В том же проекте Google Cloud создайте API ключ
2. Добавьте ключ в переменные окружения:

```bash
YOUTUBE_API_KEY=ваш_api_ключ
```

**Важно:** YouTube Data API имеет квоты:

- 10,000 единиц в день (бесплатно)
- 1 запрос к `/videos` = 1 единица
- Рекомендуется использовать батчинг (до 50 видео за запрос)

### 3. Экспорт истории просмотров из Google Takeout (альтернативный способ)

1. Перейдите на [Google Takeout](https://takeout.google.com/)
2. Выберите "YouTube" → "История просмотров"
3. Выберите формат: JSON (рекомендуется) или HTML
4. Скачайте архив и распакуйте
5. Найдите файл `watch-history.json` или `watch-history.html`

## Использование

### OAuth 2.0 авторизация (рекомендуется)

#### На фронтенде

```typescript
// 1. Получить URL для авторизации
const response = await fetch('/api/youtube/auth/url', {
  credentials: 'include', // для отправки cookies
});
const { authUrl } = await response.json();

// 2. Перенаправить пользователя на authUrl
window.location.href = authUrl;

// После авторизации пользователь будет перенаправлен обратно на /profile?youtube_connected=true

// 3. Проверить статус подключения
const statusResponse = await fetch('/api/youtube/auth/status', {
  credentials: 'include',
});
const { connected, expiresAt } = await statusResponse.json();

// 4. Получить данные пользователя
const playlistsResponse = await fetch('/api/youtube/playlists', {
  credentials: 'include',
});
const { playlists } = await playlistsResponse.json();

const likedResponse = await fetch('/api/youtube/liked', {
  credentials: 'include',
});
const { videos } = await likedResponse.json();
```

#### На бэкенде

```typescript
import { container } from '../app/container.js';

// Получить валидный access token пользователя
const accessToken = await container.integrations.youtube.oauthService.getValidAccessToken(userId);

if (accessToken) {
  // Получить плейлисты
  const playlists = await container.integrations.youtube.client.fetchUserPlaylists(accessToken);

  // Получить лайкнутые видео
  const likedVideos = await container.integrations.youtube.client.fetchLikedVideos(accessToken);

  // Получить видео из "Смотреть позже"
  const watchLater = await container.integrations.youtube.client.fetchWatchLaterVideos(accessToken);

  // Получить элементы конкретного плейлиста
  const playlistItems = await container.integrations.youtube.client.fetchPlaylistItems(
    'PLrAXtmRdnEQy6nuLM0v5gGP8g5fLxRk5j',
    accessToken,
  );
}
```

### Пример: Парсинг истории из Google Takeout (альтернативный способ)

```typescript
import { container } from '../app/container.js';
import fs from 'fs/promises';

// Загрузка и парсинг JSON файла
const jsonData = await fs.readFile('watch-history.json', 'utf-8');
const historyData = JSON.parse(jsonData);

// Парсинг истории
const items = container.integrations.youtube.historyParser.parseTakeoutJson(historyData);

// Обработка и обогащение метаданными
const result = await container.integrations.youtube.statsService.processHistory(
  items,
  true, // обогащать метаданными через YouTube API
);

console.log('Всего просмотрено:', result.stats.totalVideos);
console.log('Уникальных видео:', result.stats.uniqueVideos);
console.log('Общее время просмотра:', result.stats.totalWatchTime, 'секунд');
console.log(
  'Топ каналы:',
  Object.entries(result.stats.videosByChannel)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10),
);
```

### Пример: Получение метаданных видео

```typescript
import { container } from '../app/container.js';

// Получить детали одного видео
const details = await container.integrations.youtube.client.fetchVideoDetails('dQw4w9WgXcQ');
if (details) {
  console.log('Название:', details.title);
  console.log('Канал:', details.channelTitle);
  console.log('Просмотры:', details.viewCount);
  console.log('Длительность:', details.duration, 'секунд');
}

// Получить детали нескольких видео
const videoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw', 'kJQP7kiw5Fk'];
const detailsMap = await container.integrations.youtube.client.fetchMultipleVideoDetails(videoIds);
detailsMap.forEach((details, videoId) => {
  console.log(`${videoId}: ${details.title}`);
});
```

### Пример: Парсинг HTML файла

```typescript
import { container } from '../app/container.js';
import fs from 'fs/promises';

const htmlContent = await fs.readFile('watch-history.html', 'utf-8');
const items = container.integrations.youtube.historyParser.parseTakeoutHtml(htmlContent);
```

## Структура данных

### YouTubeWatchHistoryItem

```typescript
{
  videoId: string; // ID видео (11 символов)
  title: string; // Название видео
  channelTitle: string | null; // Название канала
  watchedAt: Date; // Дата и время просмотра
  url: string; // URL видео
}
```

### YouTubeWatchStats

```typescript
{
  totalVideos: number; // Всего просмотрено видео
  uniqueVideos: number; // Уникальных видео
  totalWatchTime: number; // Общее время просмотра (секунды)
  averageWatchTime: number; // Средняя длительность видео (секунды)
  videosByChannel: Record<string, number>; // Количество видео по каналам
  videosByDate: Record<string, number>; // Количество видео по датам (YYYY-MM-DD)
  topVideos: Array<{
    // Топ 20 самых просматриваемых
    videoId: string;
    title: string;
    watchCount: number;
  }>;
}
```

### YouTubeVideoDetails

```typescript
{
  videoId: string;
  title: string;
  description: string | null;
  channelTitle: string | null;
  channelId: string | null;
  publishedAt: string | null;        // ISO дата
  duration: number | null;           // в секундах
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  thumbnailUrl: string | null;
  tags: string[] | null;
  categoryId: string | null;
  defaultLanguage: string | null;
}
```

## Ограничения

1. **YouTube Data API квоты:**
   - 10,000 единиц в день (бесплатно)
   - 1 запрос `/videos` = 1 единица
   - Максимум 50 видео за один запрос

2. **История просмотров:**
   - YouTube API не предоставляет прямой доступ к истории
   - Необходимо использовать Google Takeout для экспорта
   - История может быть неполной (зависит от настроек приватности)

3. **Rate Limiting:**
   - YouTube API может ограничивать частые запросы
   - Реализованы автоматические повторы при таймаутах
   - Добавлены задержки между батчами

## Рекомендации

1. **Для больших объемов данных:**
   - Обрабатывайте историю порциями
   - Кэшируйте метаданные видео в базе данных
   - Используйте фоновые задачи для обогащения метаданных

2. **Оптимизация API запросов:**
   - Группируйте запросы в батчи по 50 видео
   - Кэшируйте результаты
   - Используйте обогащение метаданных только для уникальных видео

3. **Обработка ошибок:**
   - Все методы возвращают `null` при ошибках
   - Ошибки логируются автоматически
   - Парсер продолжает работу даже при некорректных записях

## Пример создания API эндпоинта

```typescript
// В контроллере или роутере
import { Request, Response } from 'express';
import { container } from '../app/container.js';

export async function uploadYouTubeHistory(req: Request, res: Response) {
  try {
    const file = req.file; // Используйте multer для загрузки файлов
    if (!file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    let items;
    if (file.mimetype === 'application/json') {
      const data = JSON.parse(file.buffer.toString('utf-8'));
      items = container.integrations.youtube.historyParser.parseTakeoutJson(data);
    } else if (file.mimetype === 'text/html') {
      items = container.integrations.youtube.historyParser.parseTakeoutHtml(
        file.buffer.toString('utf-8'),
      );
    } else {
      return res.status(400).json({ error: 'Неподдерживаемый формат файла' });
    }

    // Обработка и обогащение
    const result = await container.integrations.youtube.statsService.processHistory(items, true);

    // Сохранение в базу данных или возврат статистики
    return res.json({
      stats: result.stats,
      itemsCount: result.items.length,
    });
  } catch (error) {
    console.error('Error processing YouTube history:', error);
    return res.status(500).json({ error: 'Ошибка обработки истории' });
  }
}
```

## Дополнительные ресурсы

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3)
- [Google Takeout](https://takeout.google.com/)
- [YouTube API Quotas](https://developers.google.com/youtube/v3/getting-started#quota)
