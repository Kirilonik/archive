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
- устанавливает зависимости (`npm install`);
- запускает `npm run lint` для всех пакетов workspaces;
- выполняет `npm run test` (включая Jest-тесты сервера);
- собирает production-версии клиента и сервера.

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
   - `GET /api/auth/me` → 200 с профилем;
   - `GET /api/users/:id`, `GET /api/films`, `GET /api/series/:id`.

## CD и контейнеры

Workflow `.github/workflows/deploy.yml` запускается при пуше в `main` и при создании тэгов `v*`:

- собирает и публикует Docker-образы `server` и `client` в GitHub Container Registry (`ghcr.io/<owner>/<repo>-server` и `ghcr.io/<owner>/<repo>-client`);
- после успешной публикации (только для ветки `main`) запускает миграции БД (`node server/dist/db/migrate.js`) с использованием production-переменных окружения.

### Секреты для деплоя

В `Settings` → `Secrets and variables` → `Actions` необходимо задать:

| Secret | Назначение |
|--------|------------|
| `DEPLOY_PGHOST` | Адрес PostgreSQL |
| `DEPLOY_PGPORT` | Порт PostgreSQL (например, `5432`) |
| `DEPLOY_PGUSER` | Пользователь базы данных |
| `DEPLOY_PGPASSWORD` | Пароль |
| `DEPLOY_PGDATABASE` | Имя базы данных |

При необходимости добавьте другие секреты (например, `KINOPOISK_API_KEY`) и прокиньте их в инфраструктуру.

### Использование образов

Теги, публикуемые в GHCR:

- `ghcr.io/<owner>/<repo>-server:latest` и `ghcr.io/<owner>/<repo>-server:<commit-sha>`;
- `ghcr.io/<owner>/<repo>-client:latest` и `ghcr.io/<owner>/<repo>-client:<commit-sha>`.

Ими можно пользоваться в `docker-compose.prod.yml`, Kubernetes-манифестах и прочих оркестраторах.



