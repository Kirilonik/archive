FROM node:20-alpine

# Структура с shared для TS типов на этапе tsc
WORKDIR /work
COPY tsconfig.base.json ./tsconfig.base.json
COPY shared ./shared

COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm ci || npm install
COPY client ./client

WORKDIR /work/client
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


