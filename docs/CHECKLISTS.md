# Чек-листы

## Перед коммитом / PR

1. Убедитесь, что `.env` (или `docker-compose.yml`) содержит актуальные значения `JWT_SECRET`, `PG*`, `KINOPOISK_API_KEY`, `VITE_API_TARGET`.
2. Прогоните быстрые проверки:
   - `npm install` (root) — зависимости должны ставиться без ошибок;
   - `npm run lint`;
   - `npm run test`.
3. Убедитесь, что не осталось неиспользуемых импортов и `console.log` в серверном коде.
4. Обновите документацию, если меняли поведение API или конфигурацию.
5. Проверьте, что Docker-сборка успешна: `docker compose build`.

## Перед релизом / деплоем

1. Сбросьте и поднимите стек в чистом окружении:
   ```bash
   docker compose down
   docker volume rm media-archive_pgdata    # при необходимости пересоздать БД
   docker compose up --build
   ```
   Сервер не должен падать на миграциях (`runMigrations` использует advisory lock).
2. Выполните smoke-тесты API (можно Postman/cURL):
   - `POST /api/auth/login` → 200 + cookies;
   - `GET /api/auth/me` → 200 с профилем;
   - `GET /api/users/:id` → 200 + статистика;
   - `GET /api/films`, `GET /api/series/:id`, `GET /api/seasons/:id`, `GET /api/episodes/:id`.
3. Проверьте, что загрузка статов (`/api/users/:id/stats/detailed`) возвращает данные < 1 с.
4. Убедитесь, что клиентские guarded-маршруты перенаправляют на `/login` при отсутствии сессии.

## После выкладки

1. Мониторьте логи контейнера `server` на наличие ошибок JWT/PG.
2. Убедитесь, что новые пользователи могут зарегистрироваться (200 на `/api/auth/register`).
3. Проверяйте метрики миграций: таблица `migrations` должна содержать последнюю запись.
4. Проверьте реслинг токена (`POST /api/auth/refresh`) — ответ 200 + новые cookies.


