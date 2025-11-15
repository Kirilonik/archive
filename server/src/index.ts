import express from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { registerRoutes } from './routes/register.js';
import { errorMiddleware } from './middlewares/error.js';
import { runMigrations } from './db/migrate.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { requestLogger } from './app/middlewares/request-logger.middleware.js';
import { metricsMiddleware } from './middlewares/metrics.middleware.js';
import { logger } from './shared/logger.js';
import { csrfMiddleware } from './middlewares/csrf.js';
import { originValidationMiddleware } from './middlewares/origin.js';

async function bootstrap() {
  const app = express();

  const allowedOrigins = new Set<string>(env.allowedOrigins);
  const corsOptions: CorsOptions = {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  };

  app.use(cors(corsOptions));
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'strict-dynamic'"], // Используем strict-dynamic вместо unsafe-inline/unsafe-eval
          styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline для стилей допустим
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", env.API_BASE_URL || '', ...env.allowedOrigins],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      } : false,
      crossOriginEmbedderPolicy: false,
      hsts: env.NODE_ENV === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      } : false,
    }),
  );
  app.use(
    compression({
      threshold: 0,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(metricsMiddleware); // Сбор метрик для Prometheus
  app.use(csrfMiddleware);
  app.use(originValidationMiddleware);

  // Регистрируем роуты до запуска сервера, чтобы healthcheck был доступен сразу
  registerRoutes(app);
  app.use(errorMiddleware);

  // Запускаем сервер сразу, чтобы Railway мог подключиться
  // Railway автоматически устанавливает переменную PORT через process.env.PORT
  // Используем process.env.PORT в приоритете, так как Railway может использовать другой порт
  const PORT = process.env.PORT ? Number(process.env.PORT) : (env.PORT ?? 4000);
  if (!PORT || PORT <= 0) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT, host: '0.0.0.0', envPort: process.env.PORT, configPort: env.PORT }, 'Server listening');
  });

  // Запускаем миграции после старта сервера в фоне
  // Это позволяет Railway подключиться к серверу сразу, даже если миграции еще выполняются
  runMigrations().catch((err) => {
    logger.error({ err }, 'Migration failed');
    // Не завершаем процесс при ошибке миграции, чтобы сервер продолжал работать
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal, closing server gracefully');
    server.close(() => {
      logger.info('HTTP server closed');
      // Закрываем соединения с БД
      pool.end().then(() => {
        logger.info('Database connections closed');
        process.exit(0);
      }).catch((err) => {
        logger.error({ err }, 'Error closing database connections');
        process.exit(1);
      });
    });

    // Принудительное завершение через 10 секунд
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Обработка необработанных ошибок
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught Exception');
    shutdown('uncaughtException');
  });
}

bootstrap().catch((e) => {
  logger.error({ err: e }, 'Failed to start server');
  process.exit(1);
});


