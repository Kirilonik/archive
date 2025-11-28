FROM node:20-alpine

# Устанавливаем curl для fallback запросов к внешним API
# Используем retry логику для надежной установки
RUN set -eux; \
    for i in 1 2 3; do \
        apk update --no-cache && \
        apk add --no-cache curl && break || \
        (echo "Attempt $i failed, retrying..." && sleep 10); \
    done

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


