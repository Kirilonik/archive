### Вариант 2: Render.com (Бесплатный хостинг)

Render.com предлагает бесплатный хостинг для небольших проектов.

1. Зарегистрируйтесь на [render.com](https://render.com)
2. Создайте PostgreSQL базу данных
3. Создайте Web Service для сервера
4. Создайте Static Site для клиента
5. Настройте переменные окружения в панели Render

**Ограничения бесплатного плана:**

- Сервисы "засыпают" после 15 минут неактивности
- Ограниченные ресурсы

### Вариант 3: Fly.io

Fly.io предлагает бесплатный тарифный план с хорошими характеристиками.

1. Установите flyctl: `curl -L https://fly.io/install.sh | sh`
2. Зарегистрируйтесь: `fly auth signup`
3. Создайте приложение: `fly launch`
4. Настройте переменные окружения

## Рекомендации по безопасности

1. **Используйте сильные пароли** для базы данных и JWT секретов
2. **Регулярно обновляйте** систему и зависимости
3. **Настройте firewall** (UFW):
   ```bash
   ufw allow 22/tcp  # SSH
   ufw allow 80/tcp  # HTTP
   ufw allow 443/tcp # HTTPS
   ufw enable
   ```
4. **Настройте автоматические бэкапы** базы данных
5. **Мониторьте логи** на подозрительную активность

## Автоматические бэкапы

Создайте скрипт для бэкапов:

```bash
#!/bin/bash
# /opt/media-archive/backup.sh

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose -f /opt/media-archive/docker-compose.prod.yml exec -T postgres pg_dump -U $PGUSER $PGDATABASE > $BACKUP_DIR/backup_$DATE.sql

# Удаляем бэкапы старше 7 дней
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

Добавьте в crontab для ежедневных бэкапов:

```bash
crontab -e
# Добавьте строку:
0 2 * * * /opt/media-archive/backup.sh
```

## Обновление приложения

```bash
cd /opt/media-archive
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Решение проблем

### Приложение не запускается

1. Проверьте логи: `docker compose -f docker-compose.prod.yml logs`
2. Проверьте переменные окружения в `.env`
3. Убедитесь, что порты не заняты: `netstat -tulpn | grep -E '80|443|4000'`

### База данных не подключается

1. Проверьте, что контейнер PostgreSQL запущен: `docker compose -f docker-compose.prod.yml ps`
2. Проверьте логи PostgreSQL: `docker compose -f docker-compose.prod.yml logs postgres`
3. Убедитесь, что пароли в `.env` правильные

### SSL сертификат не работает

1. Проверьте DNS записи: `dig yourdomain.com`
2. Убедитесь, что порты 80 и 443 открыты в firewall
3. Проверьте конфигурацию Nginx: `nginx -t`

## Поддержка

Если возникли проблемы, проверьте:

- Логи приложения
- Логи Nginx: `tail -f /var/log/nginx/error.log`
- Статус контейнеров: `docker compose -f docker-compose.prod.yml ps`
