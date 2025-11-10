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
import { requestLogger } from './app/middlewares/request-logger.middleware.js';
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
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
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
  app.use(csrfMiddleware);
  app.use(originValidationMiddleware);

  await runMigrations();

  registerRoutes(app);

  app.use(errorMiddleware);

  const PORT = env.PORT ?? 4000;
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server listening');
  });
}

bootstrap().catch((e) => {
  logger.error({ err: e }, 'Failed to start server');
  process.exit(1);
});


