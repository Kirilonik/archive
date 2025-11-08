FROM node:20-alpine

WORKDIR /work

# Общая база TS
COPY tsconfig.base.json ./tsconfig.base.json

# Устанавливаем зависимости и собираем shared
COPY shared/package.json shared/tsconfig.json ./shared/
RUN cd shared && npm ci || npm install
COPY shared/src ./shared/src
RUN cd shared && npm run build || npx typescript -p tsconfig.json

# Устанавливаем зависимости и собираем server
COPY server/package.json server/tsconfig.json ./server/
RUN cd server && npm ci || npm install
COPY server/src ./server/src
RUN cd server && npm run build || npx typescript -p tsconfig.json

WORKDIR /work/server
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]


