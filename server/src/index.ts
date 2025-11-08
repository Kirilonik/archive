import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes/register.js';
import { errorMiddleware } from './middlewares/error.js';
import { runMigrations } from './db/migrate.js';
import { env } from './config/env.js';
import { requestLogger } from './app/middlewares/request-logger.middleware.js';
import { logger } from './shared/logger.js';

async function bootstrap() {
  const app = express();

  app.use(cors({ credentials: true, origin: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());
  app.use(requestLogger);

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


