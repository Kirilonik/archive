# Настройка Prometheus + Grafana

## Быстрый старт

### 1. Запуск мониторинга

```bash
# Запустить основное приложение и мониторинг вместе
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Или запустить только мониторинг (если приложение уже запущено)
docker compose -f docker-compose.monitoring.yml up -d
```

### 2. Доступ к интерфейсам

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000
  - Логин: `admin`
  - Пароль: `admin` (⚠️ **ИЗМЕНИТЕ В ПРОДАКШЕНЕ!**)

### 3. Проверка работы

1. Откройте Prometheus: http://localhost:9090
2. Перейдите в Status → Targets
3. Убедитесь, что `media-archive-server` имеет статус "UP"
4. Попробуйте запрос: `http_requests_total` в разделе Graph

### 4. Настройка Grafana

1. Откройте Grafana: http://localhost:3000
2. Войдите с учетными данными (admin/admin)
3. Prometheus уже настроен как источник данных (через provisioning)
4. Создайте дашборд или импортируйте готовый

## Собираемые метрики

### HTTP метрики

- `http_requests_total` - общее количество HTTP запросов
  - Метки: `method`, `route`, `status`
- `http_request_duration_seconds` - время ответа запросов
  - Метки: `method`, `route`
  - Гистограмма с buckets: 0.1s, 0.5s, 1s, 2s, 5s, 10s
- `http_errors_total` - количество ошибок (4xx, 5xx)
  - Метки: `method`, `route`, `status`

### База данных

- `db_connections_active` - количество активных соединений с БД

### Системные

- `nodejs_memory_usage_bytes` - использование памяти Node.js
  - Метки: `type` (heap_used, heap_total, external, rss)

## Полезные запросы Prometheus

### Количество запросов в секунду
```
rate(http_requests_total[5m])
```

### Время ответа (p95)
```
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Процент ошибок
```
rate(http_errors_total[5m]) / rate(http_requests_total[5m]) * 100
```

### Топ медленных эндпоинтов
```
topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))
```

## Настройка алертов

### Через Prometheus Alertmanager

1. Создайте файл `alertmanager.yml`:

```yaml
route:
  receiver: 'default-receiver'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'your-email@example.com'
        from: 'alerts@your-domain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-email@gmail.com'
        auth_password: 'your-app-password'
```

2. Добавьте правила в `prometheus.yml`:

```yaml
rule_files:
  - 'alerts.yml'
```

3. Создайте `alerts.yml`:

```yaml
groups:
  - name: media_archive_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Высокий процент ошибок"
          description: "Более 5% запросов возвращают ошибки"

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        annotations:
          summary: "Медленные запросы"
          description: "p95 время ответа превышает 2 секунды"

      - alert: DatabaseConnectionsExhausted
        expr: db_connections_active > 18
        for: 2m
        annotations:
          summary: "Исчерпание connection pool"
          description: "Используется более 90% соединений БД"
```

### Через Grafana

1. Откройте дашборд в Grafana
2. Создайте панель с метрикой
3. Нажмите "Edit" → "Alert" → "Create Alert"
4. Настройте условия и каналы уведомлений

## Остановка мониторинга

```bash
docker compose -f docker-compose.monitoring.yml down

# С удалением данных
docker compose -f docker-compose.monitoring.yml down -v
```

## Обновление конфигурации

После изменения `prometheus.yml`:

```bash
docker compose -f docker-compose.monitoring.yml restart prometheus
```

## Troubleshooting

### Prometheus не видит сервер

1. Проверьте, что сервер запущен: `docker ps`
2. Проверьте логи Prometheus: `docker logs media-archive-prometheus`
3. Убедитесь, что в `prometheus.yml` правильный адрес: `server:4000`
4. Проверьте, что сервер доступен из Prometheus контейнера:
   ```bash
   docker exec media-archive-prometheus wget -O- http://server:4000/api/metrics
   ```

### Grafana не видит Prometheus

1. Проверьте, что Prometheus запущен: `docker ps`
2. Проверьте конфигурацию в Grafana: Configuration → Data Sources
3. Проверьте логи Grafana: `docker logs media-archive-grafana`

### Метрики не обновляются

1. Проверьте, что middleware подключен в `server/src/index.ts`
2. Проверьте, что эндпоинт `/api/metrics` доступен: `curl http://localhost:4000/api/metrics`
3. Проверьте интервал сбора в `prometheus.yml` (по умолчанию 15s)

## Безопасность в продакшене

⚠️ **ВАЖНО для продакшена:**

1. **Измените пароль Grafana:**
   ```bash
   # В docker-compose.monitoring.yml
   GF_SECURITY_ADMIN_PASSWORD: ваш_надежный_пароль
   ```

2. **Ограничьте доступ:**
   - Используйте reverse proxy (nginx) с аутентификацией
   - Ограничьте доступ по IP
   - Используйте VPN

3. **Не экспортируйте метрики наружу:**
   - Prometheus и Grafana должны быть доступны только изнутри сети
   - Используйте внутренние порты или VPN

4. **Регулярно обновляйте:**
   ```bash
   docker compose -f docker-compose.monitoring.yml pull
   docker compose -f docker-compose.monitoring.yml up -d
   ```

## Дополнительные ресурсы

- [Prometheus документация](https://prometheus.io/docs/)
- [Grafana документация](https://grafana.com/docs/)
- [PromQL запросы](https://prometheus.io/docs/prometheus/latest/querying/basics/)

