import { Router } from 'express';
import type { SeriesController } from '../controllers/series.controller.js';
import { container } from '../container.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { generalRateLimiter, writeRateLimiter } from '../../middlewares/rate-limiters.js';

export function createSeriesRouter(controller: SeriesController) {
  const router = Router();
  router.get('/', authMiddleware, generalRateLimiter, controller.list);
  router.get('/:id/concept-art', authMiddleware, generalRateLimiter, controller.getConceptArt);
  router.get('/:id/posters', authMiddleware, generalRateLimiter, controller.getPosters);
  router.get('/:id', authMiddleware, generalRateLimiter, controller.get);
  router.post('/', authMiddleware, writeRateLimiter, controller.create);
  router.put('/:id', authMiddleware, writeRateLimiter, controller.update);
  router.delete('/:id', authMiddleware, writeRateLimiter, controller.delete);
  return router;
}

export const seriesRouter = createSeriesRouter(container.series.controller);

