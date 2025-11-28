FROM node:20-alpine

# Устанавливаем curl для fallback запросов к внешним API
# Используем retry логику для надежной установки с таймаутами
# Настраиваем таймауты через переменные окружения и проверку доступности репозиториев
RUN set -eux; \
    # Проверяем наличие timeout команды (обычно есть в alpine через busybox или coreutils)
    TIMEOUT_CMD=""; \
    if command -v timeout >/dev/null 2>&1; then \
        TIMEOUT_CMD="timeout 300"; \
        echo "✅ Using timeout command for apk operations"; \
    else \
        echo "⚠️ timeout command not available, will use direct apk calls"; \
    fi; \
    # Настраиваем таймауты для apk через переменные окружения (если поддерживается)
    export APK_OPTS="--no-cache"; \
    APK_TIMEOUT=300; \
    # Пробуем установить curl с несколькими попытками и таймаутами
    for i in 1 2 3 4 5; do \
        echo "📦 Installation attempt $i/5 (timeout: ${APK_TIMEOUT}s)"; \
        # Проверяем доступность репозиториев перед обновлением
        if [ $i -eq 1 ]; then \
            echo "🔍 Checking repository availability..."; \
            ping -c 2 -W 5 dl-cdn.alpinelinux.org >/dev/null 2>&1 || echo "⚠️ Repository ping failed, but continuing..."; \
        fi; \
        # Обновляем индекс пакетов с таймаутом
        if [ -n "$TIMEOUT_CMD" ]; then \
            if $TIMEOUT_CMD apk update $APK_OPTS 2>&1 | tee /tmp/apk-update.log; then \
                UPDATE_SUCCESS=1; \
            else \
                UPDATE_SUCCESS=0; \
                echo "⚠️ apk update failed on attempt $i (timed out or error)"; \
                cat /tmp/apk-update.log 2>/dev/null | tail -20 || true; \
            fi; \
        else \
            if apk update $APK_OPTS 2>&1 | tee /tmp/apk-update.log; then \
                UPDATE_SUCCESS=1; \
            else \
                UPDATE_SUCCESS=0; \
                echo "⚠️ apk update failed on attempt $i"; \
                cat /tmp/apk-update.log 2>/dev/null | tail -20 || true; \
            fi; \
        fi; \
        # Устанавливаем curl с таймаутом
        if [ "$UPDATE_SUCCESS" -eq 1 ]; then \
            if [ -n "$TIMEOUT_CMD" ]; then \
                if $TIMEOUT_CMD apk add $APK_OPTS curl 2>&1 | tee /tmp/apk-add.log; then \
                    echo "✅ Successfully installed curl on attempt $i"; \
                    break; \
                else \
                    echo "⚠️ apk add failed on attempt $i (timed out or error)"; \
                    cat /tmp/apk-add.log 2>/dev/null | tail -20 || true; \
                fi; \
            else \
                if apk add $APK_OPTS curl 2>&1 | tee /tmp/apk-add.log; then \
                    echo "✅ Successfully installed curl on attempt $i"; \
                    break; \
                else \
                    echo "⚠️ apk add failed on attempt $i"; \
                    cat /tmp/apk-add.log 2>/dev/null | tail -20 || true; \
                fi; \
            fi; \
        fi; \
        if [ $i -lt 5 ]; then \
            echo "⏳ Retrying in 15 seconds..."; \
            sleep 15; \
        fi; \
    done || \
    (echo "❌ Failed to install curl after 5 attempts" && \
     echo "🔍 Checking network connectivity..." && \
     ping -c 3 dl-cdn.alpinelinux.org || true && \
     echo "📋 Last apk update log:" && \
     cat /tmp/apk-update.log 2>/dev/null | tail -50 || true && \
     echo "📋 Last apk add log:" && \
     cat /tmp/apk-add.log 2>/dev/null | tail -50 || true && \
     exit 1)

WORKDIR /work

# Общая база TS
COPY tsconfig.base.json ./tsconfig.base.json

# Устанавливаем зависимости и собираем server
COPY server/package.json server/tsconfig.json ./server/
RUN cd server && npm ci || npm install
COPY server/src ./server/src
RUN cd server && npm run build || npx typescript -p tsconfig.json

WORKDIR /work/server
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]


