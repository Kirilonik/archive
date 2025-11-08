import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes/register.js';
import { errorMiddleware } from './middlewares/error.js';
import { runMigrations } from './db/migrate.js';
import { env } from './config/env.js';

async function bootstrap() {
  const app = express();

  app.use(cors({ credentials: true, origin: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());
  app.use(morgan('dev'));

  await runMigrations();

  registerRoutes(app);

  app.use(errorMiddleware);

  const PORT = env.PORT ?? 4000;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', e);
  process.exit(1);
});


