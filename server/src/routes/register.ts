import type { Express } from 'express';
import { router as healthRouter } from './routes.health.js';
import { filmsRouter } from '../app/routes/films.routes.js';
import { seriesRouter } from '../app/routes/series.routes.js';
import { seasonsRouter } from '../app/routes/seasons.routes.js';
import { episodesRouter } from '../app/routes/episodes.routes.js';
import { usersRouter } from '../app/routes/users.routes.js';
import { router as searchRouter } from './routes.search.js';
import { authRouter } from '../app/routes/auth.routes.js';
import { authMiddleware } from '../middlewares/auth.js';
import { registerSwagger } from '../docs/swagger.js';

export function registerRoutes(app: Express): void {
  registerSwagger(app);
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/films', filmsRouter);
  app.use('/api/series', seriesRouter);
  app.use('/api/seasons', seasonsRouter);
  app.use('/api/episodes', episodesRouter);
  app.use('/api/users', authMiddleware, usersRouter);
  app.use('/api/search', searchRouter);
}


