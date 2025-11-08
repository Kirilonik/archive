Запуск через Docker Compose

1) Установите переменные окружения (локально или экспортируйте в shell):

```
export PORT=4000
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=postgres
export PGDATABASE=media_archive
```

2) Запустите Compose:

```
docker compose up --build
```

Сервисы:
- Postgres: 5432
- Server: http://localhost:4000
- Client: http://localhost:5173

## CI

Репозиторий содержит workflow `.github/workflows/ci.yml`, который при push/pull-request:
- устанавливает зависимости (`npm ci`);
- запускает `npm run lint` для всех пакетов workspaces;
- выполняет `npm run test` (включая Jest-тесты сервера).

Локально тот же набор проверок можно запустить вручную:

```
npm install
npm run lint
npm run test
```

## Переменные окружения

Для локального запуска (без Docker) создайте `.env` в корне:
```
PORT=4000
NODE_ENV=development

PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=media_archive

JWT_SECRET=dev-access-secret-change-me
JWT_REFRESH_SECRET=dev-refresh-secret-change-me

KINOPOISK_API_URL=https://kinopoiskapiunofficial.tech
KINOPOISK_API_KEY=<ваш_ключ>

VITE_API_TARGET=http://localhost:4000
```

В Docker Compose переменная `VITE_API_TARGET` уже указывает на `http://server:4000`, поэтому прокси клиента работает внутри сети контейнеров.

## Перед релизом

1. Убедитесь, что применены все SQL-миграции (чистый старт `docker compose up --build` не должен падать).
2. Прогоните `npm run lint` и `npm run test` — должны завершиться без ошибок и предупреждений.
3. Проверьте, что `.env` (или секреты CI/CD) содержит корректные `JWT_*`, `KINOPOISK_API_KEY` и DB-параметры.
4. После деплоя выполните smoke-проверку API:
   - `POST /api/auth/login` с тестовым пользователем;
   - `GET /api/users/:id`, `GET /api/films`, `GET /api/series/:id`.



